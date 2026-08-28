package notary2of2

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"github.com/LFDT-Paladin/paladin/common/go/pkg/log"
	"github.com/LFDT-Paladin/paladin/toolkit/pkg/plugintk"
	"github.com/LFDT-Paladin/paladin/toolkit/pkg/prototk"
	"github.com/LFDT-Paladin/paladin/toolkit/pkg/signer"
)

type notary2of2Module struct {
	bgCtx     context.Context
	callbacks plugintk.SigningModuleCallbacks
	conf      *Notary2of2Config
	name      string
	signer    signer.SigningModule
	pubKey    *ecdsa.PublicKey
	client    *http.Client
}

func NewPlugin(ctx context.Context) plugintk.PluginBase {
	return plugintk.NewSigningModule(NewKeyManagerSigningModule)
}

func NewKeyManagerSigningModule(callbacks plugintk.SigningModuleCallbacks) plugintk.SigningModuleAPI {
	return &notary2of2Module{
		bgCtx:     context.Background(),
		callbacks: callbacks,
	}
}

func (m *notary2of2Module) ConfigureSigningModule(ctx context.Context, req *prototk.ConfigureSigningModuleRequest) (*prototk.ConfigureSigningModuleResponse, error) {
	ctx = log.WithComponent(ctx, "notary2of2")
	m.name = req.Name

	if err := json.Unmarshal([]byte(req.ConfigJson), &m.conf); err != nil {
		return nil, fmt.Errorf("notary2of2: invalid config: %s", err)
	}
	if m.conf.Signer == nil {
		return nil, fmt.Errorf("notary2of2: missing 'signer' in config")
	}
	if m.conf.Cosigner.URL == "" {
		return nil, fmt.Errorf("notary2of2: missing 'cosigner.url' in config")
	}
	if m.conf.Cosigner.PublicKey == "" {
		return nil, fmt.Errorf("notary2of2: missing 'cosigner.publicKey' in config")
	}

	var err error
	m.signer, err = signer.NewSigningModule(ctx, m.conf.Signer)
	if err != nil {
		return nil, fmt.Errorf("notary2of2: failed to initialize local signer: %s", err)
	}

	keyBytes, err := hex.DecodeString(m.conf.Cosigner.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("notary2of2: invalid cosigner.publicKey hex: %s", err)
	}
	parsed, err := x509.ParsePKIXPublicKey(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("notary2of2: cosigner.publicKey must be DER-encoded SEC1 ECDSA public key: %s", err)
	}
	var ok bool
	m.pubKey, ok = parsed.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("notary2of2: cosigner.publicKey is not an ECDSA public key")
	}

	timeout := time.Duration(m.conf.Cosigner.TimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	m.client = &http.Client{Timeout: timeout}

	log.L(ctx).Infof("notary2of2 module '%s' configured: cosigner=%s", m.name, m.conf.Cosigner.URL)
	return &prototk.ConfigureSigningModuleResponse{}, nil
}

func (m *notary2of2Module) ResolveKey(ctx context.Context, req *prototk.ResolveKeyRequest) (*prototk.ResolveKeyResponse, error) {
	return m.signer.Resolve(ctx, req)
}

func (m *notary2of2Module) Sign(ctx context.Context, req *prototk.SignWithKeyRequest) (*prototk.SignWithKeyResponse, error) {
	ctx = log.WithComponent(ctx, "notary2of2")

	attestationHash := sha256.Sum256([]byte(fmt.Sprintf("paladin-2of2-v1:%x:%s", req.Payload, req.KeyHandle)))

	cosignReq := map[string]string{
		"keyIdentifier": req.KeyHandle,
		"algorithm":     req.Algorithm,
		"payload":       hex.EncodeToString(req.Payload),
		"attestation":   hex.EncodeToString(attestationHash[:]),
	}
	body, _ := json.Marshal(cosignReq)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, m.conf.Cosigner.URL+"/cosign", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("notary2of2: cosign request failed to build: %s", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	res, err := m.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("notary2of2: cosigner unreachable (%s): %s", m.conf.Cosigner.URL, err)
	}
	defer res.Body.Close()

	var cosignRes struct {
		Approved  bool   `json:"approved"`
		Signature string `json:"signature"`
		Reason    string `json:"reason,omitempty"`
	}
	if err := json.NewDecoder(res.Body).Decode(&cosignRes); err != nil {
		return nil, fmt.Errorf("notary2of2: bad cosigner response: %s", err)
	}
	if !cosignRes.Approved {
		return nil, fmt.Errorf("notary2of2: cosigner REJECTED signing request: %s", cosignRes.Reason)
	}

	sigBytes, err := hex.DecodeString(cosignRes.Signature)
	if err != nil || len(sigBytes) != 64 {
		return nil, fmt.Errorf("notary2of2: invalid cosigner signature")
	}
	r := new(big.Int).SetBytes(sigBytes[:32])
	s := new(big.Int).SetBytes(sigBytes[32:])
	if !ecdsa.Verify(m.pubKey, attestationHash[:], r, s) {
		return nil, fmt.Errorf("notary2of2: cosigner signature verification FAILED")
	}

	log.L(ctx).Infof("notary2of2: cosigner approved signing for key '%s'", req.KeyHandle)

	return m.signer.Sign(ctx, req)
}

func (m *notary2of2Module) ListKeys(ctx context.Context, req *prototk.ListKeysRequest) (*prototk.ListKeysResponse, error) {
	return m.signer.List(ctx, req)
}

func (m *notary2of2Module) Close(ctx context.Context, req *prototk.CloseRequest) (*prototk.CloseResponse, error) {
	m.signer.Close()
	return &prototk.CloseResponse{}, nil
}
