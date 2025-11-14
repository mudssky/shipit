import { getRecentEmails } from '../../utils/email'

export async function showMailsAction(options: any) {
  if (options.verbose) {
    console.log('详细日志输出已启用')
  }
  try {
    const mails = await getRecentEmails(options.mailNumber) // 使用getRecentEmails获取邮件
    if (mails.length === 0) {
      console.log('没有找到邮件。')
      return
    }
    console.log('最近的邮件列表:')
    console.table(
      mails.map((mail) => ({
        Subject: mail.subject,
        From: mail.from?.[0].address,
        Date: mail.date,
      })),
    )
  } catch (error) {
    console.error('获取邮件时发生错误:', error)
  }
}
