// ==========================================================================
// 스마트 핀치 줌인/줌아웃 완벽 보장 엔진 (Universal Pinch Zoom Engine)
// 앱 열자마자 화면 어디서나 두 손가락 핀치 제스처 즉각 반응
// 안드로이드 웹뷰 및 모바일 브라우저의 줌 먹통 현상 근본적 해결
// ==========================================================================

(function() {
  'use strict';

  class UniversalZoomEngine {
    constructor() {
      this.target = null;
      this.scale = 1.0;
      this.minScale = 0.75;
      this.maxScale = 3.5;

      this.currentX = 0;
      this.currentY = 0;

      this.isPinching = false;
      this.isPanning = false;

      this.startDistance = 0;
      this.startScale = 1.0;
      this.startCenter = { x: 0, y: 0 };
      this.startPan = { x: 0, y: 0 };

      this.lastTouchEnd = 0;

      this.init();
    }

    init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      // 줌 대상 컨테이너 탐색 (app-container 우선, 없으면 main 또는 body)
      this.target = document.querySelector('.app-container') ||
                    document.querySelector('main') ||
                    document.body;

      if (!this.target) return;

      // 대상 요소 스타일 최적화 (하드웨어 가속)
      this.target.style.transformOrigin = '0 0';
      this.target.style.willChange = 'transform';
      this.target.style.transition = 'transform 0.05s ease-out';

      // 전역 터치 이벤트 등록 (window 레벨에서 어디서나 무조건 감지)
      window.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
      window.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
      window.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
      window.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

      // 더블 탭 시 100% 원래 배율로 부드럽게 복귀
      window.addEventListener('touchend', (e) => this.handleDoubleTap(e));

      // 줌 상태 표시/리셋 플로팅 버튼 생성 (확대 상태에서만 우측 하단에 부드럽게 등장)
      this.createResetFloatingBtn();
    }

    getDistance(t1, t2) {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.hypot(dx, dy);
    }

    getCenter(t1, t2) {
      return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
    }

    handleTouchStart(e) {
      if (e.touches.length === 2) {
        // 두 손가락 핀치 줌 시작
        this.isPinching = true;
        this.isPanning = false;

        this.startDistance = this.getDistance(e.touches[0], e.touches[1]);
        this.startScale = this.scale;
        this.startCenter = this.getCenter(e.touches[0], e.touches[1]);
        this.startPan = { x: this.currentX, y: this.currentY };

        this.target.style.transition = 'none'; // 제스처 중 즉각 반응
      } else if (e.touches.length === 1 && this.scale > 1.05) {
        // 이미 확대된 상태에서 한 손가락으로 화면 패닝(이동)
        this.isPanning = true;
        this.startCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.startPan = { x: this.currentX, y: this.currentY };
        this.target.style.transition = 'none';
      }
    }

    handleTouchMove(e) {
      if (this.isPinching && e.touches.length === 2) {
        // 핀치 줌 중 브라우저 기본 제스처 먹통 방지
        if (e.cancelable) e.preventDefault();

        const newDist = this.getDistance(e.touches[0], e.touches[1]);
        if (this.startDistance < 1) return;

        const factor = newDist / this.startDistance;
        let newScale = this.startScale * factor;

        // 줌 범위 제한 (0.75배 ~ 3.5배)
        newScale = Math.min(Math.max(newScale, this.minScale), this.maxScale);

        // 핀치 중심점을 기준으로 부드러운 위치 보정
        const center = this.getCenter(e.touches[0], e.touches[1]);
        const scaleDiff = newScale - this.startScale;

        this.scale = newScale;
        this.currentX = this.startPan.x - (center.x * scaleDiff * 0.4);
        this.currentY = this.startPan.y - (center.y * scaleDiff * 0.4);

        this.clampBounds();
        this.applyTransform();
        this.updateResetBtn();
      } else if (this.isPanning && e.touches.length === 1 && this.scale > 1.05) {
        const dx = e.touches[0].clientX - this.startCenter.x;
        const dy = e.touches[0].clientY - this.startCenter.y;

        // 약간의 움직임이 있을 때만 기본 스크롤과 자연스럽게 결합
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          this.currentX = this.startPan.x + dx;
          this.currentY = this.startPan.y + dy;
          this.clampBounds();
          this.applyTransform();
        }
      }
    }

    handleTouchEnd(e) {
      if (e.touches.length < 2) {
        this.isPinching = false;
      }
      if (e.touches.length === 0) {
        this.isPanning = false;

        // 줌 배율이 1.0에 아주 가까우면 완전 1.0으로 스냅
        if (Math.abs(this.scale - 1.0) < 0.06) {
          this.resetZoom(true);
        } else {
          this.target.style.transition = 'transform 0.15s ease-out';
          this.clampBounds();
          this.applyTransform();
        }
      }
      this.updateResetBtn();
    }

    handleDoubleTap(e) {
      // 폼 입력창이나 버튼 등에서의 탭은 방해하지 않음
      const tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'button' || tag === 'select' || e.target.closest('button')) {
        return;
      }

      const now = Date.now();
      if (now - this.lastTouchEnd < 300) {
        // 더블탭 감지 -> 1.0배율 이상이면 1.0으로 복귀, 1.0이면 1.4배로 즉시 확대
        if (this.scale > 1.1) {
          this.resetZoom(true);
        } else {
          this.zoomTo(1.4, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
      }
      this.lastTouchEnd = now;
    }

    clampBounds() {
      if (this.scale <= 1.0) {
        this.currentX = 0;
        this.currentY = 0;
        return;
      }

      const rect = this.target.getBoundingClientRect();
      const scaledWidth = (this.target.offsetWidth || window.innerWidth) * this.scale;
      const scaledHeight = (this.target.offsetHeight || window.innerHeight) * this.scale;

      const maxDx = (scaledWidth - window.innerWidth) / 2 + 100;
      const maxDy = (scaledHeight - window.innerHeight) / 2 + 150;

      this.currentX = Math.min(Math.max(this.currentX, -maxDx), maxDx);
      this.currentY = Math.min(Math.max(this.currentY, -maxDy), maxDy);
    }

    applyTransform() {
      if (!this.target) return;
      if (this.scale === 1.0 && this.currentX === 0 && this.currentY === 0) {
        this.target.style.transform = '';
      } else {
        this.target.style.transform = `translate3d(${this.currentX}px, ${this.currentY}px, 0) scale(${this.scale})`;
      }
    }

    zoomTo(newScale, clientX, clientY) {
      this.target.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
      this.scale = newScale;
      this.currentX = (window.innerWidth / 2 - clientX) * 0.4;
      this.currentY = (window.innerHeight / 2 - clientY) * 0.4;
      this.clampBounds();
      this.applyTransform();
      this.updateResetBtn();
    }

    resetZoom(smooth = true) {
      if (smooth) {
        this.target.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
      } else {
        this.target.style.transition = 'none';
      }
      this.scale = 1.0;
      this.currentX = 0;
      this.currentY = 0;
      this.applyTransform();
      this.updateResetBtn();
    }

    createResetFloatingBtn() {
      let btn = document.getElementById('btnFloatingZoomReset');
      if (btn) return;

      btn = document.createElement('button');
      btn.id = 'btnFloatingZoomReset';
      btn.type = 'button';
      btn.innerHTML = '🔍 <span style="font-weight:800;">100%</span>';
      btn.style.cssText = `
        position: fixed;
        bottom: 78px;
        right: 16px;
        z-index: 9999;
        background: rgba(15, 23, 42, 0.85);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 9999px;
        padding: 6px 12px;
        font-size: 12px;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transform: scale(0.85);
        transition: opacity 0.2s ease, transform 0.2s ease;
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetZoom(true);
      });

      document.body.appendChild(btn);
      this.resetBtn = btn;
    }

    updateResetBtn() {
      if (!this.resetBtn) return;
      if (this.scale > 1.08) {
        const pct = Math.round(this.scale * 100);
        this.resetBtn.innerHTML = `🔍 <b>${pct}%</b>`;
        this.resetBtn.style.opacity = '1';
        this.resetBtn.style.pointerEvents = 'auto';
        this.resetBtn.style.transform = 'scale(1)';
      } else {
        this.resetBtn.style.opacity = '0';
        this.resetBtn.style.pointerEvents = 'none';
        this.resetBtn.style.transform = 'scale(0.85)';
      }
    }
  }

  // 인스턴스 전역 등록 (언제든 즉시 구동)
  window.universalZoomEngine = new UniversalZoomEngine();
})();
