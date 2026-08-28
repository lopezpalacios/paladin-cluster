package notary2of2

import (
	"github.com/LFDT-Paladin/paladin/toolkit/pkg/signerapi"
)

type CosignerConfig struct {
	URL        string `json:"url"`
	PublicKey  string `json:"publicKey"`
	TimeoutSec int    `json:"timeoutSeconds"`
}

type Notary2of2Config struct {
	Signer   *signerapi.ConfigNoExt `json:"signer"`
	Cosigner CosignerConfig         `json:"cosigner"`
}
