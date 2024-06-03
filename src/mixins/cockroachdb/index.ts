import dedent from 'dedent'
import { getLatestImageVersion } from '../../util/docker'
import { Mixin, defineMixin } from '../mixin'
import terraformDocker from '../terraform-docker'

export default defineMixin(
  async (ctx): Promise<Mixin> => ({
    name: 'cockroachdb',
    apply: [terraformDocker()],
    files: [
      {
        name: 'terraform/dev/cockroachdb.tf',
        content: dedent`
          variable "cockroachdb_port" {
            default = 0
          }
          variable "cockroachdb_webui_port" {
            default = 0
          }
          
          resource "docker_image" "cockroachdb" {
            name = "${await getLatestImageVersion('cockroachdb/cockroach')}"
          }
          
          resource "docker_container" "cockroachdb" {
            name    = "${ctx.pkg.name}/cockroachdb"
            image   = docker_image.cockroachdb.image_id
            restart = "always"
            command = ["start-single-node", "--insecure"]
            ports {
              internal = 26257
              external = var.cockroachdb_port
            }
            ports {
              internal = 8080
              external = var.cockroachdb_webui_port
            }
            volumes {
              host_path      = abspath("\${path.module}/../../data/cockroach_data")
              container_path = "/cockroach/cockroach-data"
            }
          }

          output "cockroachdb_port" {
            value = docker_container.cockroachdb.ports[0].external
          }
          output "cockroachdb_webui_port" {
            value = docker_container.cockroachdb.ports[1].external
          }
        `,
      },
    ],
    gitignore: {
      comment: 'CockroachDB',
      globs: ['data/cockroach_data'],
    },
  })
)
