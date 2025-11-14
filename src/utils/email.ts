import { ImapFlow } from 'imapflow'
import { globalConfig } from '../config'

class ImapClientSingleton {
  private static instance: ImapFlow

  private constructor() {}

  public static getInstance(): ImapFlow {
    if (!ImapClientSingleton.instance) {
      ImapClientSingleton.instance = new ImapFlow({
        host: globalConfig.DING_IMAP_HOST,
        port: globalConfig.DING_IMAP_PORT,
        secure: true,
        auth: {
          user: globalConfig.DING_IMAP_USER,
          pass: globalConfig.DING_IMAP_PASS,
        },
        // logger: console, // 可以根据需要启用日志
        logger: false,
      })
    }
    return ImapClientSingleton.instance
  }
}

export const imapClient = ImapClientSingleton.getInstance()

/**
 * 获取最近的邮件
 * @param count 需要获取的邮件数量
 * @returns 返回邮件列表
 */
export async function getRecentEmails(count: number = 10) {
  try {
    // 连接邮箱服务器
    await imapClient.connect()

    // 选择收件箱
    const lock = await imapClient.getMailboxLock('INBOX')

    try {
      // 获取邮箱总消息数
      const mailbox = await imapClient.mailboxOpen('INBOX')
      const total = mailbox.exists

      // 计算起始序号，确保不会超出邮件总数
      const from = Math.max(1, total - count + 1)
      const to = total

      // 获取指定范围的邮件
      const messages = []
      for await (const message of imapClient.fetch(`${from}:${to}`, {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
        source: true,
      })) {
        messages.push({
          ...message,
          uid: message.uid,
          subject: message.envelope?.subject,
          from: message.envelope?.from,
          to: message.envelope?.to,
          date: message.envelope?.date,
          flags: message.flags,
        })
      }

      return messages.reverse() // 按时间从新到旧排序
    } finally {
      // 释放锁
      lock.release()
    }
  } catch (error) {
    console.error('获取邮件失败:', error)
    throw error
  } finally {
    // 关闭连接
    try {
      await imapClient.logout()
    } catch (error) {
      console.error('关闭邮箱连接失败:', error)
    }
  }
}
