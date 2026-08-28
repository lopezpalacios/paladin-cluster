package main

import (
	"C"
)

import (
	"github.com/LFDT-Paladin/paladin/toolkit/pkg/plugintk"
	"github.com/lopezpalacios/paladin-cluster/signingmodules/notary-2of2/internal/notary2of2"
)

var ple = plugintk.NewPluginLibraryEntrypoint(func() plugintk.PluginBase {
	return plugintk.NewSigningModule(func(callbacks plugintk.SigningModuleCallbacks) plugintk.SigningModuleAPI {
		return notary2of2.NewKeyManagerSigningModule(callbacks)
	})
})

//export Run
func Run(grpcTargetPtr, pluginUUIDPtr *C.char) int {
	return ple.Run(
		C.GoString(grpcTargetPtr),
		C.GoString(pluginUUIDPtr),
	)
}

//export Stop
func Stop(pluginUUIDPtr *C.char) {
	ple.Stop(C.GoString(pluginUUIDPtr))
}

func main() {}
