package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"time"
)

type Config struct {
	Listen       string   `json:"listen"`
	PrivateKey   string   `json:"privateKey"`
	ClientPubKey string   `json:"clientPublicKey"`
	AllowedKeys  []string `json:"allowedKeyIdentifiers"`
}

type CosignRequest struct {
	KeyIdentifier string `json:"keyIdentifier"`
	Algorithm     string `json:"algorithm"`
	Payload       string `json:"payload"`
	Attestation   string `json:"attestation"`
}

type CosignResponse struct {
	Approved  bool   `json:"approved"`
	Signature string `json:"signature,omitempty"`
	Reason    string `json:"reason,omitempty"`
}

var (
	cfg       Config
	agentKey  *ecdsa.PrivateKey
	clientKey *ecdsa.PublicKey
	allowed   []*regexp.Regexp
)

func loadKey(hexKey string) (*ecdsa.PrivateKey, error) {
	b, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, err
	}
	parsed, err := x509.ParseECPrivateKey(b)
	if err != nil {
		return nil, err
	}
	return parsed, nil
}

func loadPub(hexKey string) (*ecdsa.PublicKey, error) {
	b, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, err
	}
	parsed, err := x509.ParsePKIXPublicKey(b)
	if err != nil {
		return nil, err
	}
	pub, ok := parsed.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("not an ECDSA public key")
	}
	return pub, nil
}

func handleCosign(w http.ResponseWriter, r *http.Request) {
	var req CosignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		write(w, CosignResponse{Approved: false, Reason: "bad request"})
		return
	}

	for _, re := range allowed {
		if re.MatchString(req.KeyIdentifier) {
			goto policyOK
		}
	}
	write(w, CosignResponse{Approved: false, Reason: fmt.Sprintf("keyIdentifier '%s' not allowed by policy", req.KeyIdentifier)})
	return

policyOK:
	attestation, err := hex.DecodeString(req.Attestation)
	if err != nil || len(attestation) != 32 {
		write(w, CosignResponse{Approved: false, Reason: "bad attestation"})
		return
	}

	payload, err := hex.DecodeString(req.Payload)
	if err != nil {
		write(w, CosignResponse{Approved: false, Reason: "bad payload hex"})
		return
	}
	_ = payload

	r1, s1, err := ecdsa.Sign(rand.Reader, agentKey, attestation)
	_ = err
	rb := make([]byte, 32)
	sb := make([]byte, 32)
	copy(rb[32-len(r1.Bytes()):], r1.Bytes())
	copy(sb[32-len(s1.Bytes()):], s1.Bytes())
	sig := append(rb, sb...)

	log.Printf("APPROVED key=%s algorithm=%s payloadLen=%d", req.KeyIdentifier, req.Algorithm, len(payload))
	write(w, CosignResponse{Approved: true, Signature: hex.EncodeToString(sig)})
}

func write(w http.ResponseWriter, res CosignResponse) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

func main() {
	configPath := flag.String("config", "cosigner.json", "path to cosigner config")
	genkey := flag.Bool("genkey", false, "generate a new agent key and print its private key hex + public key hex")
	flag.Parse()

	if *genkey {
		k, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		if err != nil {
			log.Fatal(err)
		}
		privDER, _ := x509.MarshalECPrivateKey(k)
		pubDER, _ := x509.MarshalPKIXPublicKey(&k.PublicKey)
		fmt.Printf("privateKey (agent config):  %x\n", privDER)
		fmt.Printf("publicKey (module config):  %x\n", pubDER)
		return
	}

	raw, err := os.ReadFile(*configPath)
	if err != nil {
		log.Fatalf("cannot read config: %s", err)
	}
	if err := json.Unmarshal(raw, &cfg); err != nil {
		log.Fatalf("bad config: %s", err)
	}
	if cfg.Listen == "" {
		cfg.Listen = ":9191"
	}

	agentKey, err = loadKey(cfg.PrivateKey)
	if err != nil {
		log.Fatalf("bad agent privateKey (need hex DER EC private key): %s", err)
	}
	if cfg.ClientPubKey != "" {
		clientKey, err = loadPub(cfg.ClientPubKey)
		if err != nil {
			log.Fatalf("bad clientPublicKey: %s", err)
		}
		_ = clientKey
	}
	for _, pattern := range cfg.AllowedKeys {
		re, err := regexp.Compile(pattern)
		if err != nil {
			log.Fatalf("bad allowedKeyIdentifiers regex '%s': %s", pattern, err)
		}
		allowed = append(allowed, re)
	}
	if len(allowed) == 0 {
		allowed = append(allowed, regexp.MustCompile(".*"))
	}

	pubBytes, _ := x509.MarshalPKIXPublicKey(&agentKey.PublicKey)
	log.Printf("cosigner agent listening on %s", cfg.Listen)
	log.Printf("agent public key (for module config): %x", pubBytes)

	mux := http.NewServeMux()
	mux.HandleFunc("/cosign", handleCosign)
	srv := &http.Server{
		Addr:              cfg.Listen,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Fatal(srv.ListenAndServe())
}
