// 综合演示 - 展示所有改进后的消息格式
const webhookUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/4dae1acf-99d6-4b94-a2e9-c67b47601f22';

async function sendMessage(title, description, data) {
    console.log(`\n📤 发送: ${title}`);
    console.log(`   ${description}`);

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (result.code === 0) {
            console.log(`   ✅ 发送成功`);
        } else {
            console.log(`   ❌ 发送失败: ${result.msg}`);
        }
    } catch (e) {
        console.error(`   ❌ 发送异常: ${e.message}`);
    }
}

async function demo() {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   打印机监控系统 - 飞书推送功能演示                  ║');
    console.log('║   Printer Monitor - Feishu Push Demo                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝');

    // 1. 报表消息
    await sendMessage(
        '📊 每日报表',
        '蓝色卡片，包含设备状态、更换记录、耗材警告',
        {
            msg_type: 'interactive',
            card: {
                header: {
                    title: { tag: 'plain_text', content: '📊 打印机耗材日报' },
                    template: 'blue'
                },
                elements: [
                    {
                        tag: 'div',
                        text: {
                            tag: 'lark_md',
                            content: '**设备状态**\n总计: 5 台\n在线: 4 台\n离线: 1 台\n  • 打印机E (三楼会议室)'
                        }
                    },
                    { tag: 'hr' },
                    {
                        tag: 'div',
                        text: {
                            tag: 'lark_md',
                            content: '**本月更换**\n2/10 10:30 打印机A 黑色墨盒\n2/9 14:20 打印机B 彩色墨盒'
                        }
                    },
                    { tag: 'hr' },
                    {
                        tag: 'div',
                        text: {
                            tag: 'lark_md',
                            content: '**耗材不足**\n🔴 打印机C 黄色 3%\n🟡 打印机D 蓝色 8%'
                        }
                    },
                    { tag: 'hr' },
                    {
                        tag: 'note',
                        elements: [{
                            tag: 'plain_text',
                            content: '报表生成时间: ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                        }]
                    }
                ]
            }
        }
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. 耗尽警报
    await sendMessage(
        '🚨 耗材耗尽警报',
        '红色卡片，最高优先级',
        {
            msg_type: 'interactive',
            card: {
                header: {
                    title: { tag: 'plain_text', content: '🚨 耗材耗尽' },
                    template: 'red'
                },
                elements: [
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**打印机**\n办公室打印机A'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**位置**\n二楼办公区'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**耗材**\n黑色墨盒'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**剩余**\n0%'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**状态**\n已耗尽，请立即更换'
                            }
                        }]
                    },
                    { tag: 'hr' },
                    {
                        tag: 'note',
                        elements: [{
                            tag: 'plain_text',
                            content: '时间: ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                        }]
                    }
                ]
            }
        }
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. 不足警报
    await sendMessage(
        '⚠️ 耗材不足警报',
        '橙色卡片，提醒及时更换',
        {
            msg_type: 'interactive',
            card: {
                header: {
                    title: { tag: 'plain_text', content: '⚠️ 耗材不足' },
                    template: 'orange'
                },
                elements: [
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**打印机**\n会议室打印机B'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**位置**\n三楼会议室'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**耗材**\n彩色墨盒'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**剩余**\n8%'
                            }
                        }]
                    },
                    { tag: 'hr' },
                    {
                        tag: 'note',
                        elements: [{
                            tag: 'plain_text',
                            content: '时间: ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                        }]
                    }
                ]
            }
        }
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. 更换通知
    await sendMessage(
        '🔄 耗材更换通知',
        '绿色卡片，记录更换操作',
        {
            msg_type: 'interactive',
            card: {
                header: {
                    title: { tag: 'plain_text', content: '🔄 耗材更换' },
                    template: 'green'
                },
                elements: [
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**打印机**\n财务部打印机C'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**位置**\n四楼财务部'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**耗材**\n黄色墨盒'
                            }
                        }]
                    },
                    {
                        tag: 'div',
                        fields: [{
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: '**用量**\n15% → 95%'
                            }
                        }]
                    },
                    { tag: 'hr' },
                    {
                        tag: 'note',
                        elements: [{
                            tag: 'plain_text',
                            content: '时间: ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                        }]
                    }
                ]
            }
        }
    );

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   ✅ 演示完成！请检查飞书群查看效果                  ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n📋 演示内容:');
    console.log('   1. 📊 每日报表 (蓝色卡片)');
    console.log('   2. 🚨 耗材耗尽警报 (红色卡片)');
    console.log('   3. ⚠️ 耗材不足警报 (橙色卡片)');
    console.log('   4. 🔄 耗材更换通知 (绿色卡片)');
    console.log('\n💡 提示: 所有消息都使用了交互式卡片格式，美观且易读！');
}

demo();
