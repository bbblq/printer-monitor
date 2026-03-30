
import { NextResponse } from 'next/server';
import { sendFeishuCard } from '@/lib/notification';

export async function POST(req: Request) {
    try {
        const result = await sendFeishuCard('飞书机器人测试', '**这是一条测试消息**\n\n- 如果您收到此消息，说明机器人配置成功！\n- 目前监控正常运行中。', 'green');
        if (result) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: '发送失败，请检查 Webhook 地址' }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
