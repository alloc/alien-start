import dedent from 'dedent'
import fs from 'fs'
import { bold } from 'kleur/colors'
import os from 'os'
import { loadMixin } from '../../use'
import { info } from '../../util/log'
import { resolveOptions } from '../../util/options'
import { which, whichRequire } from '../../util/which'
import { Mixin, defineMixin } from '../mixin'

export type Options = {
  engine?: 'docker' | 'colima'
}

export default defineMixin<Options>(
  async (ctx, options): Promise<Mixin | null> => {
    if (fs.existsSync('terraform/dev/docker.tf')) {
      return null
    }

    if (!(await which('docker'))) {
      info(
        '\nThe docker command-line tool is required to use the Terraform Docker provider.'
      )
      info('If you have it installed, make sure it is in your PATH.')
      if (os.platform() === 'darwin' && (await which('brew'))) {
        info(
          `Otherwise, you can install it with ${bold('brew install docker')}`
        )
      }
      await whichRequire('docker', 1000)
    }

    await resolveOptions(options, {
      engine: {
        type: 'select',
        message: 'Choose a Docker engine',
        choices: [
          { title: 'Docker', value: 'docker' },
          {
            title: 'Colima',
            value: 'colima',
            description:
              '(macOS/Linux only) https://github.com/abiosoft/colima',
          },
        ],
      },
    })

    let dockerProvider = dedent`
      terraform {
        required_providers {
          docker = {
            source = "kreuzwerker/docker"
          }
        }
      }
    `

    dockerProvider += '\n'
    if (options.engine === 'colima') {
      dockerProvider += dedent`
        provider "docker" {
          host = "unix://\${pathexpand("~/.colima/docker.sock")}"
        }
      `
    } else {
      dockerProvider += dedent`
        provider "docker" {
          host = "unix:///var/run/docker.sock"
        }
      `
    }

    // If this command exits with a non-zero status, the Docker daemon is not running.
    const checkCommand =
      options.engine === 'colima' ? 'colima status' : 'docker stats --no-stream'

    // Start the Colima daemon or instruct the user to start Docker.
    const instructions =
      options.engine === 'colima'
        ? `Colima is not running. Waiting for you to start it...\n\nHint: To continue, try running ${bold('colima start -f')} in another shell.\n`
        : 'Docker is not running. Waiting for you to start it...\n'

    // Display the status of the Docker daemon.
    const statusCommand = options.engine === 'colima' ? 'colima status' : ''

    return {
      name: 'terraform-docker',
      apply: [loadMixin(import('../terraform'))],
      files: [
        {
          name: 'terraform/dev/docker.tf',
          content: dockerProvider,
        },
        {
          name: 'scripts/dev/pre/terraform.bash',
          content: dedent`
            set -e

            # Initialize the development environment.
            if [ -d "terraform/dev" ]; then
              cd terraform/dev
              if ! ${checkCommand} &> /dev/null; then
                echo "${instructions}"
                while true; do
                  sleep 0.25
                  if ${checkCommand} &> /dev/null; then
                    break
                  fi
                done
              fi
              ${statusCommand}
              terraform apply -auto-approve
              terraform output -json > outputs.json
            fi
          `,
        },
      ],
    }
  }
)
