-- apt_trades: MOLIT 실거래가 건별 원시 데이터
-- deal_type: T=매매, J=전세, W=월세
CREATE TABLE IF NOT EXISTS apt_trades (
  id             BIGSERIAL    PRIMARY KEY,
  lawd_cd        CHAR(5)      NOT NULL,
  apt_name       TEXT         NOT NULL,
  dong           TEXT         NOT NULL,
  exclusive_area NUMERIC(7,2),
  floor          SMALLINT,
  price          INTEGER,        -- 만원 (매매가 or 전세 보증금)
  monthly_rent   SMALLINT,       -- 만원 (월세만)
  deal_ym        CHAR(6)      NOT NULL,
  deal_day       SMALLINT,
  build_year     SMALLINT,
  deal_type      CHAR(1)      NOT NULL DEFAULT 'T',
  UNIQUE (lawd_cd, apt_name, dong, exclusive_area, floor, deal_ym, deal_day, deal_type)
);

CREATE INDEX IF NOT EXISTS idx_apt_trades_complex
  ON apt_trades (lawd_cd, apt_name, dong);

CREATE INDEX IF NOT EXISTS idx_apt_trades_ym
  ON apt_trades (deal_ym DESC);

CREATE INDEX IF NOT EXISTS idx_apt_trades_area
  ON apt_trades (lawd_cd, apt_name, exclusive_area);
