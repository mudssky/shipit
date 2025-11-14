import { execSync } from 'child_process'
export interface StagedOption {
  detailed?: boolean
}
export const showStagedChanges = (options: StagedOption) => {
  const { detailed = false } = options
  console.log({ options })

  const command = detailed
    ? 'git diff --cached'
    : 'git diff --cached --name-only'
  const output = execSync(command).toString()
  console.log(output)
}

export const showUnstagedChanges = () => {
  const output = execSync('git diff --name-only').toString()
  console.log(output)
}
