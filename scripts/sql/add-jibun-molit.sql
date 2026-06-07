-- apt_trades: jibun(지번) 컬럼 추가
ALTER TABLE apt_trades ADD COLUMN IF NOT EXISTS jibun TEXT;

-- apartment_complexes: MOLIT 연동 컬럼 추가
ALTER TABLE apartment_complexes ADD COLUMN IF NOT EXISTS molit_key TEXT;
ALTER TABLE apartment_complexes ADD COLUMN IF NOT EXISTS source    TEXT DEFAULT 'kapt';
CREATE UNIQUE INDEX IF NOT EXISTS idx_apt_complexes_molit_key
  ON apartment_complexes(molit_key) WHERE molit_key IS NOT NULL;

-- 인덱스: jibun 있는 행 빠른 조회
CREATE INDEX IF NOT EXISTS idx_apt_trades_jibun
  ON apt_trades(lawd_cd, apt_name) WHERE jibun IS NOT NULL;
