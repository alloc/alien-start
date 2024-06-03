import dedent from 'dedent'
import { getLatestImageVersion } from '../../util/docker'
import { Mixin, defineMixin } from '../mixin'
import terraformDocker from '../terraform-docker'

export default defineMixin(
  async (ctx): Promise<Mixin> => ({
    name: 'postgres',
    apply: [terraformDocker()],
    files: [
      {
        name: 'terraform/dev/postgres.tf',
        content: dedent`
          variable "pg_port" {
            default = 0
          }

          resource "docker_image" "postgres" {
            name = "${await getLatestImageVersion('postgres', '-alpine')}"
          }

          resource "docker_container" "postgres" {
            name    = "${ctx.pkg.name}/postgres"
            image   = docker_image.postgres.image_id
            restart = "always"
            ports {
              internal = 5432
              external = var.pg_port
            }
            volumes {
              host_path      = abspath("\${path.module}/../../data/pg_data")
              container_path = "/var/lib/postgresql/data"
            }
            env = [
              "POSTGRES_PASSWORD=postgres"
            ]
          }

          output "pg_port" {
            value = docker_container.postgres.ports[0].external
          }
        `,
      },
    ],
    gitignore: {
      comment: 'Postgres',
      globs: ['data/pg_data'],
    },
  })
)
