# alien-start

Enhance your [AlienDOM](https://github.com/alloc/alien-dom) project with instant integrations.

This command-line tool is automatically included in the [alien-dom-starter](https://github.com/alloc/alien-dom-starter) template repository.

## What does it do?

AlienStart makes assumptions about your project structure, leaving you to focus on the fun parts of building your app. It can instantly add a plethora of useful tools to your AlienDOM project, like UnoCSS, Postgres, and more. We're always expanding the list of available integrations, so if you have a suggestion, please open an issue or a pull request!

AlienStart makes it very easy to add your own integrations (referred to as "mixins"). Take a look at our `./src/mixins/` folder to see how stream-lined the process is. In the future, we'll support using standalone mixins from the NPM registry.

## The `init` command

If you're using the `alien-dom-starter` template, the `alien-start init` command will run automatically when you first install your project's initial dependencies.

AlienStart `init` first gives you the opportunity to name your project, replacing all occurrences of the default name provided by the template. Then it will pin your project's dependencies to the latest major-minor version (using caret `^` syntax in the `package.json` files). This ensures reproducible installs for all developers on your team, while also ensuring you have the latest dependency versions available in your new project.

That's it for the `init` command!

## The `use` command

This is the proverbial "meat and potatoes" of AlienStart. The `use` command is how you add integrations to your project.

You can specify the mixins you want to use as arguments to the `use` command. If you misspell any, the CLI will suggest the closest match.

```sh
$ alien-start use unocss postgres
```

You can call `use` without any arguments to see a list of available mixins. You can even search the list by typing! Once you find the mixins you want, select them with spacebar and press Enter to continue the integration process.

```sh
$ alien-start use
```

Once a mixin is applied, AlienStart will automatically commit to your project's git repository. This makes it easy to undo the integration if you change your mind.

## The `run` command

The last command allows for mixins to add their own lifecycle scripts without crowding up your `package.json` file. AlienStart provides a dedicated `scripts` folder for this purpose.

If you're just getting started, don't worry too much about the specifics of the `run` command. Just know that it gives mixins the ability to extend your `pnpm dev` and `pnpm build` commands with their own scripts. They can even perform one-time setup by providing a "prepare" script.

For example, when you run `alien-start run dev`, AlienStart will run all scripts in the `scripts/dev` folder. This is a great place for mixins to add their own commands that run when you do `pnpm dev` in your terminal (assuming your package.json is set up to use `alien-start run`). Since dev scripts run in parallel by default, we also support serial execution with the `scripts/dev/pre` folder.

The `run` command isn't limited to dev scripts. Any `scripts/{name}` folder will be run when you do `alien-start run {name}`. These other script folders always use serial execution, and they support both pre and post execution with the special `pre` and `post` subfolders.
