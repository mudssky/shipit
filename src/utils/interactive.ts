import inquirer from 'inquirer'

export async function confirm(
  message: string,
  defaultYes = true,
): Promise<boolean> {
  const ans = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message,
      default: defaultYes,
    },
  ])
  return Boolean(ans.ok)
}

export async function inputDir(
  defaultValue: string,
  validate?: (v: string) => true | string,
): Promise<string> {
  const ans = await inquirer.prompt([
    {
      type: 'input',
      name: 'dir',
      message: '请输入目标目录',
      default: defaultValue,
      validate: (v: string) => {
        if (!validate) return true
        return validate(v)
      },
    },
  ])
  return String(ans.dir)
}

export async function inputText(
  message: string,
  defaultValue = '',
): Promise<string> {
  const ans = await inquirer.prompt([
    { type: 'input', name: 'text', message, default: defaultValue },
  ])
  return String(ans.text || '')
}

export async function pickFromList<T>(
  items: T[],
  toChoice: (it: T) => { name: string; value: T },
  message = '请选择一个条目',
): Promise<T | null> {
  if (!items.length) return null
  const choices = items.map(toChoice)
  const ans = await inquirer.prompt([
    {
      type: 'list',
      name: 'picked',
      message,
      choices,
    },
  ])
  return ans.picked as T
}

export async function pickAction(
  actions: Array<{ name: string; value: string }>,
  message = '请选择操作',
): Promise<string | null> {
  if (!actions.length) return null
  const ans = await inquirer.prompt([
    {
      type: 'list',
      name: 'act',
      message,
      choices: actions,
    },
  ])
  return String(ans.act)
}
