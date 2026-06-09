-- apt_trades 테이블에 apt_seq (MOLIT 단지 일련번호) 컬럼 추가
-- 예시값: "11110-2339" (sggCd-단지번호)
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE apt_trades ADD COLUMN IF NOT EXISTS apt_seq TEXT;

CREATE INDEX IF NOT EXISTS apt_trades_apt_seq_idx ON apt_trades(apt_seq);
