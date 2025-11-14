import { z } from 'zod'
import inquirer from 'inquirer'
import { globalConfig, GlobalEnvConfig } from '@/config'
import { GitlabAutomator, ProjectInfo } from '@/playwright/gitlabAutomator'

const optionSchema = z.object({
  interactive: z.boolean().optional(),
  projectUrl: z.string().optional(),
  branchRoutes: z.array(z.string()).optional(),
})
export type MergeActionOption = z.infer<typeof optionSchema>

export async function mergeAction(option: MergeActionOption) {
  option = optionSchema.parse(option)
  console.log(option)
  const mergeOptions = { ...option }
  if (option.interactive) {
    // 获取配置中的GitLab项目列表
    const gitlabProjects = globalConfig.gitlabProjects || []

    if (gitlabProjects.length === 0) {
      console.error('没有找到GitLab项目配置，请检查配置文件')
      return
    }
    // // 用户输入了projectUrl，需要判断配置文件中是否有该项目
    // if (option.projectUrl) {
    //   const foundProject = gitlabProjects.find(
    //     (project) =>
    //       project.projectURL.replace(/\/$/, '') ===
    //       option.projectUrl?.replace(/\/$/, ''),
    //   )
    //   if (!foundProject) {
    //     console.error(
    //       '输入的项目URL在配置文件中未找到，请检查配置文件或项目URL',
    //     )
    //     return
    //   }
    //   // 使用找到的项目信息
    //   projectUrl = foundProject.projectURL
    //   console.log(`使用配置文件中的项目: ${projectUrl}`)
    // }
    const userSelect: Record<string, any> = {
      selectedProject: {},
    }
    if (!mergeOptions.projectUrl) {
      // 步骤1：选择项目
      const projectChoices = gitlabProjects.map((project, index) => ({
        name: `${index + 1}. ${project.projectURL}`,
        value: index,
      }))

      const { projectIndex } = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectIndex',
          message: '请选择要操作的项目：',
          choices: projectChoices,
        },
      ])

      const selectedProject = gitlabProjects[projectIndex]
      mergeOptions.projectUrl = selectedProject.projectURL
      userSelect.selectedProject = selectedProject
      console.log(`已选择项目: ${selectedProject.projectURL}`)
    }

    if (!mergeOptions.branchRoutes) {
      if (!userSelect.selectedProject) {
        throw new Error('用户没有选择项目,无法获取可选分支')
      }
      const selectedProject = userSelect.selectedProject
      // 步骤2：选择合并路线
      if (
        !selectedProject?.mergeRoutes ||
        selectedProject.mergeRoutes.length === 0
      ) {
        console.error('所选项目没有配置合并路线')
        return
      }

      const routeChoices = selectedProject.mergeRoutes.map(
        (routesItem: any, index: number) => ({
          name: routesItem.routes.join(' -> '),
          value: index,
        }),
      )

      const { routeIndex } = await inquirer.prompt([
        {
          type: 'list',
          name: 'routeIndex',
          message: '请选择合并路线：',
          choices: routeChoices,
        },
      ])

      const selectedRoute = selectedProject.mergeRoutes[routeIndex]
      userSelect.selectedRoute = selectedRoute
      mergeOptions.branchRoutes = selectedRoute.routes
      console.log(`已选择合并路线: ${selectedRoute.routes.join(' -> ')}`)
    }

    try {
      // 初始化GitLab自动化工具
      const ga = await GitlabAutomator.createCustomWebsiteAutomator(
        globalConfig.playwrightConfig.websiteOption.gitlab,
      )

      console.log('ga config', ga.getConfig())
      // 从选择的路线中获取源分支和目标分支
      if (!mergeOptions.branchRoutes || mergeOptions.branchRoutes.length < 2) {
        console.error('所选路线没有足够的分支')
        return
      }

      // 执行合并操作
      await ga.gitlabMerge({
        projectUrl: mergeOptions.projectUrl,
        branchRoutes: mergeOptions.branchRoutes,
      })
      await ga.closeContext()
    } catch (error) {
      console.error('执行合并操作时出错:', error)
    }
  } else {
    console.log('请使用 --interactive 或 -i 选项启用交互式模式')
  }
}
