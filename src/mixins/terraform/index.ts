import dedent from 'dedent'
import fs from 'fs'
import { loadMixin } from '../../use'
import { info } from '../../util/log'
import { which, whichRequire } from '../../util/which'
import { Mixin, ScriptExec, defineMixin } from '../mixin'

export default defineMixin(async (): Promise<Mixin | null> => {
  const initScript: ScriptExec = {
    enforce: 'post',
    message: 'Installing Terraform modules...',
    cmd: 'terraform',
    args: ['init'],
    cwd: 'terraform/dev',
    stdio: 'inherit',
  }

  // Since other mixins apply this one, avoid running twice, but make sure to rerun the "terraform
  // init" command so that any newly added modules are installed.
  if (fs.existsSync('terraform')) {
    info('Terraform directory exists.')
    return {
      name: 'terraform',
      exec: [initScript],
    }
  }

  if (!(await which('terraform'))) {
    info('\nThe terraform command-line tool is required to use Terraform.')
    info('If you have it installed, make sure it is in your PATH.')
    info(
      'Otherwise, you can install it from https://developer.hashicorp.com/terraform/install'
    )
    await whichRequire('terraform', 1000)
  }

  return {
    name: 'terraform',
    apply: [
      loadMixin(import('../prepare-script')),
      loadMixin(import('../dev-script')),
    ],
    gitignore: {
      comment: 'Terraform',
      globs: [
        'terraform.tfvars',
        'terraform/**/outputs.json',
        '.terraform',
        '*.tfstate*',
      ],
    },
    files: [
      {
        name: 'scripts/prepare/terraform.bash',
        content: dedent`
          set -e

          # Install Terraform modules for development.
          if [ -d "terraform/dev" ]; then
            cd terraform/dev
            terraform init
          fi
        `,
      },
      {
        name: 'scripts/dev/pre/terraform.bash',
        content: dedent`
          set -e

          # Initialize the development environment.
          if [ -d "terraform/dev" ]; then
            cd terraform/dev
            terraform apply -auto-approve
            terraform output -json > outputs.json
          fi
        `,
      },
    ],
    exec: [initScript],
  }
})
