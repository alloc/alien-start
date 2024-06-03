import * as deep from '@aleclarson/deep'
import prompts, { Choice, PromptObject } from 'prompts'

interface StaticPromptObject extends PromptObject {
  name: string
  choices?: Choice[]
}

export type OptionsPrompt<Options> = {
  [K in string & keyof Options]?: Options[K] extends infer Option
    ? Option extends undefined
      ? never
      : Option extends object
        ? Option extends readonly any[]
          ? Omit<StaticPromptObject, 'name'>
          :
              | OptionsPrompt<Option>
              | (StaticPromptObject & { name: string & keyof Option })[]
        : Omit<StaticPromptObject, 'name'>
    : never
}

export async function resolveOptions<Options>(
  options: Options,
  prompt: OptionsPrompt<Options>
): Promise<Options> {
  const next = async (
    prompt: OptionsPrompt<Options> | StaticPromptObject,
    path: string[] = []
  ) => {
    if (isPromptObject(prompt)) {
      const initial = deep.get(options, path)
      if (
        prompt.type === 'multiselect' ||
        prompt.type === 'autocompleteMultiselect'
      ) {
        if (Array.isArray(initial)) {
          for (const choice of prompt.choices!) {
            if (initial.includes(choice.value)) {
              choice.selected = true
            }
          }
        }
      } else if (prompt.type === 'select' || prompt.type === 'autocomplete') {
        if (initial !== undefined) {
          for (const choice of prompt.choices!) {
            if (choice.value === initial) {
              choice.selected = true
              break
            }
          }
        }
      } else if (
        initial !== undefined &&
        ['text', 'number', 'confirm'].includes(prompt.type as string)
      ) {
        prompt.initial = initial
      }
      const name = typeof prompt.name === 'string' ? prompt.name : path.at(-1)!
      const result = await prompts({ ...prompt, name })
      if (result[name] == null) {
        process.exit()
      }
      deep.set(options, path, result[name])
    } else {
      for (const [key, value] of Object.entries<any>(prompt)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            await next(item, [...path, key])
          }
        } else {
          await next(value, [...path, key])
        }
      }
    }
  }

  await next(prompt)
}

function isPromptObject(
  config: OptionsPrompt<any> | Omit<StaticPromptObject, 'name'>
): config is StaticPromptObject {
  return typeof config.type === 'string'
}
