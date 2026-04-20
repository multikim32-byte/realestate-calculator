import { NextRequest, NextResponse } from 'next/server';
import { fetchLhAttachments } from '@/lib/lhApi';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const panId      = searchParams.get('panId') ?? '';
  const ccrCd      = searchParams.get('ccrCd') ?? '03';
  const uppTpCd    = searchParams.get('uppTpCd') ?? '';
  const aisTpCd    = searchParams.get('aisTpCd') ?? '';

  const key = process.env.LH_API_KEY;
  if (!key || !panId) return NextResponse.json({ attachments: [] });

  try {
    const attachments = await fetchLhAttachments(key, {
      ccrCnt: panId,
      ccrCnntSysDsCd: ccrCd,
      uppAisTpCd: uppTpCd,
      aisTpCd,
      splInfTpCd: '010',
    });
    return NextResponse.json({ attachments });
  } catch {
    return NextResponse.json({ attachments: [] });
  }
}
