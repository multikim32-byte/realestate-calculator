'use client';

import { useState } from 'react';
import GlobalNav from '@/app/components/GlobalNav';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

const faqs: { category: string; items: { q: string; a: string | React.ReactNode }[] }[] = [
  {
    category: '🗺️ 지도',
    items: [
      {
        q: '태블릿에서 지도가 움직이지 않아요.',
        a: 'Chrome 또는 삼성 브라우저에서 "데스크톱 사이트 요청" 기능이 켜져 있으면 터치 이벤트가 마우스로 변환되어 지도 패닝이 작동하지 않습니다. 브라우저 메뉴(⋮) → 데스크톱 사이트를 체크 해제하거나, 네이버 웨일 브라우저를 사용하시면 정상 동작합니다.',
      },
      {
        q: '지도에서 아파트 단지가 보이지 않아요.',
        a: '단지 핀은 레벨 7 이하(시군구 수준)에서만 로드됩니다. 줌인하면 단지 태그가 나타납니다. 레벨 6~7에서는 클러스터 원으로, 레벨 5 이하에서는 개별 이름·가격 태그로 표시됩니다.',
      },
      {
        q: '지도 시세 오버레이가 안 보여요.',
        a: '시세 오버레이는 레벨 8 이상(광역 뷰)에서만 표시됩니다. 줌아웃하면 시군구별 평균 시세가 색상으로 표시됩니다.',
      },
    ],
  },
  {
    category: '📊 실거래가',
    items: [
      {
        q: '실거래가 데이터가 없거나 빈 화면이 나와요.',
        a: '국토교통부 실거래가 API를 실시간으로 조회합니다. 일일 조회 한도 초과 시 일시적으로 데이터가 표시되지 않을 수 있으며, 다음 날 자정 이후 복구됩니다. 또한 해당 지역·월에 신고된 거래가 없으면 빈 화면이 맞습니다.',
      },
      {
        q: '실거래 데이터가 최신이 아닌 것 같아요.',
        a: '국토부 실거래가 신고 기한은 계약 후 30일입니다. 이번 달 거래는 다음 달에 공개되는 경우가 많습니다. 또한 API 응답 지연으로 최근 2~3일 데이터는 다소 늦을 수 있습니다.',
      },
      {
        q: '단지 상세에서 전세/매매 이력이 안 나와요.',
        a: '단지명으로 매칭하는 방식이라 국토부 API의 아파트명과 DB 단지명이 다를 경우 이력이 조회되지 않을 수 있습니다. 단지명 불일치 문제는 지속적으로 개선 중입니다.',
      },
    ],
  },
  {
    category: '🏠 청약·분양',
    items: [
      {
        q: '청약 정보는 어디서 가져오나요?',
        a: 'LH(한국토지주택공사) 공공데이터 API와 국토교통부 분양정보 API를 활용합니다. 모든 데이터는 공식 출처 기반이며, 청약 신청은 반드시 청약홈(applyhome.co.kr) 공식 사이트에서 하세요.',
      },
      {
        q: '청약 정보는 얼마나 자주 갱신되나요?',
        a: '매일 새벽 자동으로 최신 청약 공고를 수집합니다. 급하게 확인이 필요하면 청약홈 공식 사이트를 참고하세요.',
      },
      {
        q: '미분양 정보가 최신인지 확인할 수 있나요?',
        a: '각 미분양 카드 하단에 마지막 업데이트 날짜가 표시됩니다. 공식 분양사 또는 국토부 미분양 현황과 차이가 있을 수 있으므로 투자·계약 전 반드시 공식 채널을 확인하세요.',
      },
    ],
  },
  {
    category: '🔔 알림·즐겨찾기',
    items: [
      {
        q: '카카오 알림은 어떻게 받나요?',
        a: '상단 노란색 "카카오" 버튼을 클릭해 단지집사 카카오 채널을 친구 추가하면 됩니다. 관심 단지 등록 후 청약 일정·새 거래가 접수되면 알림 메시지를 보내드립니다.',
      },
      {
        q: '즐겨찾기가 저장되지 않아요.',
        a: '즐겨찾기는 브라우저 로컬 스토리지에 저장됩니다. 브라우저 데이터(쿠키·캐시)를 삭제하거나 다른 기기에서 접속하면 즐겨찾기가 초기화됩니다. 현재는 로그인 없이 제공되는 서비스로, 계정 연동은 추후 지원 예정입니다.',
      },
    ],
  },
  {
    category: '🧮 계산기',
    items: [
      {
        q: '취득세 계산 기준이 무엇인가요?',
        a: '2023년 이후 기준 세율을 적용합니다. 1주택·조정지역 여부·주택 면적에 따라 세율이 달라지며, 실제 납부세액은 지방세 감면, 생애최초 혜택 등에 따라 다를 수 있습니다. 정확한 세액은 관할 시·군·구청에서 확인하세요.',
      },
      {
        q: 'DSR/대출 계산 결과가 실제와 다를 수 있나요?',
        a: '참고용 계산기로 실제 대출 한도·금리는 금융기관마다 다릅니다. 개인 신용등급, 소득 심사, 은행별 내부 정책에 따라 달라지므로 반드시 금융기관에서 정식 상담을 받으세요.',
      },
    ],
  },
  {
    category: '💬 기타',
    items: [
      {
        q: '데이터 오류나 건의사항은 어디에 알리나요?',
        a: (
          <>
            <Link href="/contact" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>문의하기</Link> 페이지를 통해 알려주시면 빠르게 검토 후 반영하겠습니다. 카카오 채널 채팅으로도 문의 가능합니다.
          </>
        ),
      },
      {
        q: '광고는 왜 나오나요?',
        a: '단지집사는 무료 서비스입니다. 서버 운영 비용 충당을 위해 Google AdSense 광고가 일부 페이지에 표시됩니다. 광고 콘텐츠는 자동으로 결정되며 단지집사와 무관합니다.',
      },
      {
        q: '서비스는 무료인가요?',
        a: '모든 기능은 무료로 제공됩니다. 회원가입 없이 사용할 수 있으며, 유료 전환 계획은 없습니다.',
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string | React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #e5e7eb' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '16px 0',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>
          Q. {q}
        </span>
        <ChevronDown
          size={18}
          style={{
            flexShrink: 0, color: '#6b7280',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>
      {open && (
        <div style={{
          padding: '0 0 16px 16px',
          fontSize: 14, color: '#374151', lineHeight: 1.8,
          borderLeft: '3px solid #1d4ed8',
          marginLeft: 4,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div style={{ minHeight: '100dvh', background: '#f8fafc' }}>
      <GlobalNav />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
            자주 묻는 질문
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            궁금한 점이 해결되지 않으면&nbsp;
            <Link href="/contact" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>문의하기</Link>
            를 이용해 주세요.
          </p>
        </div>

        {/* 카테고리별 FAQ */}
        {faqs.map(group => (
          <div key={group.category} style={{ marginBottom: 36 }}>
            <h2 style={{
              fontSize: 15, fontWeight: 700, color: '#1d4ed8',
              marginBottom: 4, paddingBottom: 8,
              borderBottom: '2px solid #1d4ed8',
            }}>
              {group.category}
            </h2>
            {group.items.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        ))}

        {/* 하단 CTA */}
        <div style={{
          marginTop: 48, padding: '24px', borderRadius: 12,
          background: '#eff6ff', textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 600, marginBottom: 8 }}>
            원하는 답변을 찾지 못했나요?
          </p>
          <Link href="/contact" style={{
            display: 'inline-block', padding: '10px 24px',
            background: '#1d4ed8', color: '#fff', borderRadius: 8,
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            1:1 문의하기
          </Link>
        </div>
      </div>
    </div>
  );
}
