{
  description = "paladin-kind — local Paladin cluster via kind (LFDT-Paladin operator config)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [ "aarch64-darwin" "x86_64-linux" ];
      forAll = f: nixpkgs.lib.genAttrs systems (s: f nixpkgs.legacyPackages.${s});
    in
    {
      apps = forAll (pkgs: {
        default = {
          type = "app";
          program = "${pkgs.writeShellApplication {
            name = "paladin-kind";
            text = ''
              usage() {
                echo "usage: paladin-kind {up|down|status}"
                echo "  up      kind create cluster --name paladin --config paladin-kind.yaml"
                echo "  down    kind delete cluster --name paladin"
                echo "  status  kubectl cluster-info --context kind-paladin"
              }

              case "''${1:-}" in
                up)
                  ${pkgs.kind}/bin/kind create cluster --name paladin \
                    --config "''${PALADIN_KIND_CONFIG:-$PWD/paladin-kind.yaml}"
                  ;;
                down)
                  ${pkgs.kind}/bin/kind delete cluster --name paladin
                  ;;
                status)
                  ${pkgs.kubectl}/bin/kubectl cluster-info --context kind-paladin
                  ;;
                *)
                  usage
                  exit 1
                  ;;
              esac
            '';
          }}/bin/paladin-kind";
        };
      });

      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.kind pkgs.kubectl pkgs.kubernetes-helm ];
          shellHook = ''
            echo "paladin-kind · docker required (colima on macOS)"
            echo "cluster up:   kind create cluster --name paladin --config paladin-kind.yaml"
            echo "cluster down: kind delete cluster --name paladin"
          '';
        };
      });
    };
}
