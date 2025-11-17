import { ImapFlow } from 'imapflow'
import { ShipitError } from '@/utils/errors'
import { globalConfig } from '../config'

class ImapClientSingleton {
  private static instance: ImapFlow

  private constructor() {}

  public static getInstance(): ImapFlow {
    if (!ImapClientSingleton.instance) {
      const host = globalConfig.DING_IMAP_HOST
      const port = globalConfig.DING_IMAP_PORT
      const user = globalConfig.DING_IMAP_USER
      const pass = globalConfig.DING_IMAP_PASS
      if (!host || !port || !user || !pass) {
        throw new ShipitError('缺少钉邮 IMAP 配置')
      }
      ImapClientSingleton.instance = new ImapFlow({
        host,
        port,
        secure: true,
        auth: {
          user,
          pass,
        },
        // logger: console, // 可以根据需要启用日志
        logger: false,
      })
    }
    return ImapClientSingleton.instance
  }
}

/**
 * 获取最近的邮件
 * @param count 需要获取的邮件数量
 * @returns 返回邮件列表
 */
export async function getRecentEmails(count: number = 10) {
  let client: ImapFlow | null = null
  try {
    client = ImapClientSingleton.getInstance()
    // 连接邮箱服务器
    await client.connect()

    // 选择收件箱
    const lock = await client.getMailboxLock('INBOX')

    try {
      // 获取邮箱总消息数
      const mailbox = await client.mailboxOpen('INBOX')
      const total = mailbox.exists

      // 计算起始序号，确保不会超出邮件总数
      const from = Math.max(1, total - count + 1)
      const to = total

      // 获取指定范围的邮件
      const messages = []
      for await (const message of client.fetch(`${from}:${to}`, {
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
      if (client) {
        await client.logout()
      }
    } catch (error) {
      console.error('关闭邮箱连接失败:', error)
    }
  }
}
