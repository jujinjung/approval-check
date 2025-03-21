// 전역 변수 설정
let isActive = false; 
let statusText = null;
let startButton = null;
let countdownDisplay = null;
let isMinimized = false;
let controlPanel = null;
let minimizeButton = null;
let clickTimer = null;
let countdown = null;
let authorizationStatus = null;
let isAuthorized = false; // 승인 상태 저장 변수
let keepAwakeTimer = null; // 화면 보호기 방지 타이머
let version = "2.1"; // 버전 정보 (원격 업데이트 시 변경)

// 승인 여부 확인 함수 - '승인 확인' 버튼 클릭 시에만 호출
async function checkAuthorization() {
  // 로컬 스토리지에서 승인 정보 확인
  const storedAuth = localStorage.getItem('autoClickerAuth');
  const storedTimestamp = localStorage.getItem('autoClickerAuthTime');
  
  // 24시간(86400000 밀리초) 이내에 승인된 상태라면 서버 확인 없이 승인 처리
  if (storedAuth === 'approved' && storedTimestamp) {
    const savedTime = parseInt(storedTimestamp);
    const currentTime = new Date().getTime();
    
    // 24시간 이내인지 확인
    if (currentTime - savedTime < 86400000) {
      console.log('로컬 스토리지에서 승인 상태 확인: 승인됨 (24시간 유효)');
      isAuthorized = true;
      updateAuthorizationUI();
      return true;
    }
  }
  
  // 로컬 스토리지에 유효한 승인 정보가 없다면 서버에서 확인
  try {
    // GitHub raw 파일에서 승인 상태 가져오기
    const response = await fetch("https://raw.githubusercontent.com/jujinjung/approval-check/main/approval.txt");
    if (!response.ok) {
      console.error('승인 파일을 불러올 수 없습니다:', response.status);
      isAuthorized = false;
    } else {
      const text = await response.text();
      // 승인 텍스트 확인
      isAuthorized = text.includes('승인');
      console.log(`승인 상태 확인: ${isAuthorized ? '승인됨' : '승인되지 않음'}`);
      
      // 승인된 경우 로컬 스토리지에 저장
      if (isAuthorized) {
        localStorage.setItem('autoClickerAuth', 'approved');
        localStorage.setItem('autoClickerAuthTime', new Date().getTime().toString());
        console.log('승인 상태를 로컬 스토리지에 저장했습니다 (24시간 유효)');
      }
      
      // 수정 중 메시지 확인
      const isMaintenance = text.includes('수정중 제작자에게 연락해주세요');
      if (isMaintenance) {
        statusText.textContent = "움직이는 요소 없음, 다음 버튼 클릭 중...";
      }
      
      // 다음 버튼 클릭
      executePageNavigation();

      if (isActive) {
        setTimeout(() => runAutoClicker(), 1000);
      }
    }, movingElementFound ? 1000 : 0);
  });
}

// 움직이는 요소 찾기 및 클릭 (콜백 기반)
function findAndClickMovingElement(callback) {
  try {
    // 우측 하단 영역에 있는 보이는 요소만 찾기
    const allElements = document.querySelectorAll('*');
    const visibleElements = Array.from(allElements).filter(el => {
      try {
        if (!isElementVisible(el)) return false;
        
        const rect = el.getBoundingClientRect();
        // 우측 하단 영역에 있는 요소인지 확인 (화면의 우측 30%, 하단 30%)
        return rect.left > window.innerWidth * 0.7 && 
               rect.top > window.innerHeight * 0.7;
      } catch (e) {
        return false;
      }
    });
    
    console.log(`우측 하단 영역에 있는 보이는 요소 ${visibleElements.length}개 발견`);
    
    // 각 요소의 초기 위치 저장
    const initialPositions = new Map();
    visibleElements.forEach(el => {
      try {
        const rect = el.getBoundingClientRect();
        initialPositions.set(el, { top: rect.top, left: rect.left });
      } catch (e) {
        // 일부 요소는 getBoundingClientRect를 지원하지 않을 수 있음
      }
    });
    
    // 잠시 대기 후 위치 변화 확인
    setTimeout(() => {
      const movingElements = [];
      
      visibleElements.forEach(el => {
        try {
          const initialPos = initialPositions.get(el);
          if (!initialPos) return;
          
          const currentRect = el.getBoundingClientRect();
          
          // 위치 변화 확인 (1px 이상 변화)
          if (Math.abs(initialPos.top - currentRect.top) > 1 || 
              Math.abs(initialPos.left - currentRect.left) > 1) {
            movingElements.push(el);
          }
        } catch (e) {
          // 오류 무시
        }
      });
      
      console.log(`움직이는 요소 ${movingElements.length}개 발견`);
      let clicked = false;
      
      if (movingElements.length > 0) {
        // "학습", "퀴즈", "완료", "클릭" 등의 텍스트가 있는 요소 우선 클릭
        const keywordElements = movingElements.filter(el => {
          return el.textContent && 
                 (el.textContent.includes("학습") || 
                  el.textContent.includes("퀴즈") || 
                  el.textContent.includes("완료") || 
                  el.textContent.includes("클릭"));
        });
        
        if (keywordElements.length > 0) {
          console.log("키워드가 있는 움직이는 요소 클릭:", keywordElements[0]);
          try {
            keywordElements[0].click();
            clicked = true;
          } catch (e) {
            console.error("키워드 요소 클릭 중 오류:", e);
          }
        }
        
        // 키워드 없으면 첫 번째 움직이는 요소 클릭
        if (!clicked && movingElements.length > 0) {
          console.log("첫 번째 움직이는 요소 클릭:", movingElements[0]);
          try {
            movingElements[0].click();
            clicked = true;
          } catch (e) {
            console.error("움직이는 요소 클릭 중 오류:", e);
          }
        }
      }
      
      // 콜백으로 결과 전달
      callback(clicked);
    }, 500); // 0.5초 대기
  } catch (e) {
    console.error("움직이는 요소 찾기 중 오류:", e);
    callback(false);
  }
}

// 페이지 넘김 실행 함수
function executePageNavigation() {
  console.log("페이지 넘김 실행 시작");
  statusText.textContent = "페이지 넘김 시도 중...";
  
  let success = false;
  
  try {
    // 효과적인 클릭 순서: 우측 영역 클릭 -> 오른쪽 화살표 키 이벤트 발생 -> 다음 버튼 클릭
    
    // 1. 화면 우측 영역 클릭 시도
    if (rightSideClick()) {
      console.log("화면 우측 영역 클릭 성공");
      statusText.textContent = "화면 우측 클릭 성공!";
      success = true;
    }
    
    // 2. 오른쪽 화살표 키 이벤트 발생 (추가됨)
    setTimeout(() => {
      console.log("오른쪽 화살표 키 이벤트 발생");
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        code: 'ArrowRight',
        keyCode: 39,
        which: 39,
        bubbles: true
      }));
    }, 300);
    
    // 3. 백업: 다음 버튼 클릭 시도
    setTimeout(() => {
      if (!success && findAndClickNextButton()) {
        console.log("다음 버튼 클릭 성공");
        statusText.textContent = "다음 버튼 클릭 성공!";
        success = true;
      }
      
      if (!success) {
        console.log("페이지 넘김 시도 실패");
        statusText.textContent = "페이지 넘김 실패, 다음 시도 대기 중...";
      }
    }, 600);
  } catch (e) {
    console.error("페이지 넘김 중 오류:", e);
    statusText.textContent = "오류 발생, 다음 시도 대기 중...";
  }
  
  return success;
}

// 화면 우측 영역 클릭
function rightSideClick() {
  try {
    // 첫 번째 시도: 우측 영역 클릭 가능한 요소 찾기
    const allElements = document.querySelectorAll('button, a, [role="button"], div, span');
    const rightElements = Array.from(allElements).filter(el => {
      try {
        const rect = el.getBoundingClientRect();
        return rect.left > window.innerWidth * 0.7 && // 화면 우측 30% 영역에 있는 요소
               rect.top > window.innerHeight * 0.3 && // 화면 상단에서 너무 높지 않은 위치
               rect.top < window.innerHeight * 0.7 &&   // 화면 하단에서 너무 낮지 않은 위치
               isElementVisible(el);  // 화면에 보이는 요소만
      } catch (e) {
        return false;
      }
    });
    
    if (rightElements.length > 0) {
      try {
        rightElements[0].click();
        return true;
      } catch (e) {
        console.error("요소 클릭 중 오류:", e);
      }
    }
    
    // 두 번째 시도: 문서 우측 영역 직접 클릭 이벤트 발생
    const rightX = window.innerWidth * 0.85; // 우측 85% 지점
    const middleY = window.innerHeight * 0.5; // 화면 중앙 높이
    
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: rightX,
      clientY: middleY
    });
    
    // 문서 요소에 클릭 이벤트 발생
    document.elementFromPoint(rightX, middleY)?.dispatchEvent(clickEvent) || 
    document.body.dispatchEvent(clickEvent);
    
    console.log("우측 영역 직접 클릭 이벤트 발생", rightX, middleY);
    return true;
  } catch (e) {
    console.error("우측 영역 클릭 중 오류:", e);
    return false;
  }
}

// 다음 버튼 찾기 및 클릭
function findAndClickNextButton() {
  try {
    // 다음 버튼 텍스트 기반 검색
    const textBasedButtons = Array.from(document.querySelectorAll('*')).filter(el => {
      if (!el.textContent) return false;
      
      // "다음" 포함, "이전" 포함하지 않는 텍스트
      const hasNextText = el.textContent.includes('다음') && !el.textContent.includes('이전');
      
      // 화면에 보이는지 확인
      return hasNextText && isElementVisible(el);
    });
    
    if (textBasedButtons.length > 0) {
      console.log("텍스트 기반 다음 버튼 발견:", textBasedButtons[0]);
      try {
        textBasedButtons[0].click();
        return true;
      } catch (e) {
        console.error("다음 버튼 클릭 중 오류:", e);
      }
    }
    
    // 화살표 아이콘 버튼 찾기 (오른쪽 절반에 있는 작은 버튼 또는 화살표 모양 요소)
    const arrowButtons = Array.from(document.querySelectorAll('button, a, [role="button"], svg, i, span')).filter(el => {
      try {
        // 작은 크기의 요소 (버튼이나 아이콘)
        const rect = el.getBoundingClientRect();
        const isArrowSize = (rect.width < 50 && rect.height < 50);
        const isRightSide = rect.left > window.innerWidth / 2;
        
        return isElementVisible(el) && isArrowSize && isRightSide;
      } catch (e) {
        return false;
      }
    });
    
    if (arrowButtons.length > 0) {
      console.log("아이콘 기반 다음 버튼 후보:", arrowButtons[0]);
      try {
        arrowButtons[0].click();
        return true;
      } catch (e) {
        console.error("아이콘 버튼 클릭 중 오류:", e);
      }
    }
    
    return false;
  } catch (e) {
    console.error("다음 버튼 검색 중 오류:", e);
    return false;
  }
}

// 요소가 화면에 보이는지 확인하는 헬퍼 함수
function isElementVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  
  try {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' &&
           style.opacity !== '0';
  } catch (e) {
    return false;
  }
}

// 코드 업데이트 확인 함수 (새로운 기능)
async function checkForUpdates() {
  try {
    // GitHub에서 최신 코드 헤더 정보 가져오기
    const response = await fetch("https://raw.githubusercontent.com/jujinjung/approval-check/main/extension-code.js", {
      method: 'HEAD'
    });
    
    if(response.ok) {
      const etag = response.headers.get('etag');
      const lastModified = response.headers.get('last-modified');
      
      // 로컬 스토리지에 저장된 정보와 비교
      const storedEtag = localStorage.getItem('autoClickerCodeEtag');
      const storedTimestamp = localStorage.getItem('codeTimestamp');
      
      // 새 업데이트가 있으면 코드 다시 로드
      if (etag !== storedEtag || !storedEtag) {
        console.log("코드 업데이트가 감지되었습니다. 새 버전을 로드합니다.");
        
        // 전체 코드 가져오기
        const codeResponse = await fetch("https://raw.githubusercontent.com/jujinjung/approval-check/main/extension-code.js");
        if(codeResponse.ok) {
          const newCode = await codeResponse.text();
          
          // 로컬 스토리지에 저장
          localStorage.setItem('cachedExtensionCode', newCode);
          localStorage.setItem('autoClickerCodeEtag', etag);
          localStorage.setItem('codeTimestamp', new Date().getTime().toString());
          
          // 페이지 새로고침하여 새 코드 적용
          alert("새 버전이 감지되었습니다. 페이지를 새로고침합니다.");
          location.reload();
        }
      } else {
        console.log("코드가 최신 상태입니다.");
      }
    }
  } catch (error) {
    console.error("업데이트 확인 중 오류:", error);
  }
}

// 페이지 로드 시 UI 생성 및 업데이트 확인
window.addEventListener('load', () => {
  createUI();
  
  // 1시간마다 업데이트 확인
  checkForUpdates();
  setInterval(checkForUpdates, 3600000);
});

// DOM이 준비되면 UI 생성
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createUI);
} else {
  createUI();
}

// 디버깅 정보 표시
console.log(`원격 코드 버전 ${version} 로드됨 - 개선된 움직이는 요소 감지 및 다음 버튼 클릭 스크립트`);Content = "수정중 제작자에게 연락해주세요";
        isAuthorized = false;
        // 수정 중일 경우 로컬 스토리지 승인 정보 제거
        localStorage.removeItem('autoClickerAuth');
        localStorage.removeItem('autoClickerAuthTime');
      }
    }
  } catch (error) {
    console.error('승인 상태 확인 중 오류 발생:', error);
    
    // 네트워크 오류 발생 시 로컬 스토리지에 승인 정보가 있으면 그것을 사용
    if (storedAuth === 'approved') {
      console.log('네트워크 오류 발생, 로컬 스토리지의 승인 정보를 사용합니다.');
      isAuthorized = true;
    } else {
      isAuthorized = false;
    }
  }
  
  // UI 업데이트
  updateAuthorizationUI();
  
  return isAuthorized;
}

// 승인 상태 UI 업데이트 함수
function updateAuthorizationUI() {
  if (!authorizationStatus) return;
  
  authorizationStatus.textContent = isAuthorized ? `승인 상태: 승인됨 (v${version})` : "승인 상태: 승인되지 않음";
  authorizationStatus.style.backgroundColor = isAuthorized ? "rgba(0, 128, 0, 0.7)" : "rgba(255, 0, 0, 0.7)";
  
  // 실행 중인데 승인이 취소된 경우 중지
  if (!isAuthorized && isActive) {
    stopAutoClicker();
    isActive = false;
    startButton.textContent = "10초 간격 클릭 시작";
    startButton.style.backgroundColor = "#4CAF50";
    statusText.textContent = "승인 취소로 중지됨";
    countdownDisplay.style.display = "none";
    
    // 최소화 상태에서 비활성화 표시
    if (isMinimized) {
      controlPanel.style.border = "";
    }
  }
}

// 버튼 클릭 시 승인 확인 함수
function checkAuthorizationOnClick() {
  // 이미 승인된 경우 다시 확인하지 않고 바로 통과
  if (isAuthorized) {
    return true;
  }
  
  // 승인되지 않은 경우 상태 표시만 업데이트
  statusText.textContent = "승인이 필요합니다. '승인 확인' 버튼을 눌러주세요.";
  return false;
}

// UI 생성 함수
function createUI() {
  // 이미 생성된 경우 중복 생성 방지
  if (statusText && startButton) return;
  
  // 컨트롤 패널 생성 (모든 UI 요소의 컨테이너)
  controlPanel = document.createElement("div");
  controlPanel.style.position = "fixed";
  controlPanel.style.bottom = "10px";
  controlPanel.style.right = "10px";
  controlPanel.style.zIndex = "9999";
  controlPanel.style.display = "flex";
  controlPanel.style.flexDirection = "column";
  controlPanel.style.alignItems = "flex-end";
  controlPanel.style.gap = "5px";
  document.body.appendChild(controlPanel);
  
  // 승인 상태 텍스트 생성
  authorizationStatus = document.createElement("div");
  authorizationStatus.style.padding = "5px 10px";
  authorizationStatus.style.backgroundColor = "rgba(128, 128, 128, 0.7)";
  authorizationStatus.style.color = "white";
  authorizationStatus.style.fontSize = "14px";
  authorizationStatus.style.borderRadius = "4px";
  authorizationStatus.textContent = "승인 상태: 확인 필요";
  controlPanel.appendChild(authorizationStatus);
  
  // 상태 텍스트 생성
  statusText = document.createElement("div");
  statusText.style.padding = "5px 10px";
  statusText.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  statusText.style.color = "white";
  statusText.style.fontSize = "14px";
  statusText.style.borderRadius = "4px";
  statusText.textContent = "대기 중";
  controlPanel.appendChild(statusText);
  
  // 카운트다운 표시 생성
  countdownDisplay = document.createElement("div");
  countdownDisplay.style.padding = "5px 10px";
  countdownDisplay.style.backgroundColor = "rgba(50, 50, 200, 0.7)";
  countdownDisplay.style.color = "white";
  countdownDisplay.style.fontSize = "14px";
  countdownDisplay.style.borderRadius = "4px";
  countdownDisplay.style.display = "none";
  controlPanel.appendChild(countdownDisplay);
  
  // 버튼 컨테이너 생성
  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.gap = "10px";
  controlPanel.appendChild(buttonContainer);
  
  // 승인 확인 버튼 생성 (제일 왼쪽으로 이동)
  const checkAuthButton = document.createElement("button");
  checkAuthButton.textContent = "승인 확인";
  checkAuthButton.style.padding = "8px 15px";
  checkAuthButton.style.cursor = "pointer";
  checkAuthButton.style.backgroundColor = "#9C27B0";
  checkAuthButton.style.color = "white";
  checkAuthButton.style.border = "none";
  checkAuthButton.style.borderRadius = "4px";
  checkAuthButton.style.fontSize = "14px";
  
  // 승인 확인 버튼 이벤트 핸들러
  checkAuthButton.addEventListener("click", async () => {
    authorizationStatus.textContent = "승인 상태: 확인 중...";
    authorizationStatus.style.backgroundColor = "rgba(128, 128, 128, 0.7)";
    
    await checkAuthorization();
    
    if (isAuthorized) {
      statusText.textContent = "승인되었습니다. 기능을 사용할 수 있습니다.";
      // 승인 상태 유지 - 한 번 승인되면 계속 유지
      isAuthorized = true;
    } else {
      statusText.textContent = "승인되지 않았습니다. 작동할 수 없습니다.";
    }
  });
  
  buttonContainer.appendChild(checkAuthButton);
  
  // 시작/중지 버튼 생성
  startButton = document.createElement("button");
  startButton.textContent = "10초 간격 클릭 시작";
  startButton.style.padding = "8px 15px";
  startButton.style.cursor = "pointer";
  startButton.style.backgroundColor = "#4CAF50";
  startButton.style.color = "white";
  startButton.style.border = "none";
  startButton.style.borderRadius = "4px";
  startButton.style.fontSize = "14px";
  
  // 시작/중지 버튼 이벤트 핸들러
  startButton.addEventListener("click", () => {
    // 클릭 시 승인 여부 확인 - 승인된 경우에만 작동
    if (isAuthorized) {
      toggleAutoClick();
    } else {
      checkAuthorizationOnClick(); // 승인 안내 메시지 표시
    }
  });
  
  buttonContainer.appendChild(startButton);
  
  // 즉시 클릭 버튼 생성
  const instantButton = document.createElement("button");
  instantButton.textContent = "지금 클릭";
  instantButton.style.padding = "8px 15px";
  instantButton.style.cursor = "pointer";
  instantButton.style.backgroundColor = "#2196F3";
  instantButton.style.color = "white";
  instantButton.style.border = "none";
  instantButton.style.borderRadius = "4px";
  instantButton.style.fontSize = "14px";
  
  // 즉시 클릭 버튼 이벤트 핸들러
  instantButton.addEventListener("click", () => {
    // 클릭 시 승인 여부 확인 - 승인된 경우에만 작동
    if (isAuthorized) {
      statusText.textContent = "클릭 동작 실행 중...";
      executeClickSequence();
    } else {
      checkAuthorizationOnClick(); // 승인 안내 메시지 표시
    }
  });
  
  buttonContainer.appendChild(instantButton);
  
  // 최소화/최대화 버튼 생성
  minimizeButton = document.createElement("button");
  minimizeButton.textContent = "최소화";
  minimizeButton.style.padding = "4px 6px";
  minimizeButton.style.cursor = "pointer";
  minimizeButton.style.backgroundColor = "#FF9800";
  minimizeButton.style.color = "white";
  minimizeButton.style.border = "none";
  minimizeButton.style.borderRadius = "2px";
  minimizeButton.style.fontSize = "7px";
  
  // 최소화/최대화 버튼 이벤트 핸들러
  minimizeButton.addEventListener("click", toggleMinimize);
  
  buttonContainer.appendChild(minimizeButton);
  
  // 초기 승인 상태 확인 - 로컬 스토리지에서 먼저 확인
  const storedAuth = localStorage.getItem('autoClickerAuth');
  const storedTimestamp = localStorage.getItem('autoClickerAuthTime');
  
  if (storedAuth === 'approved' && storedTimestamp) {
    const savedTime = parseInt(storedTimestamp);
    const currentTime = new Date().getTime();
    
    // 24시간 이내라면 자동으로 승인됨 상태로 설정
    if (currentTime - savedTime < 86400000) {
      isAuthorized = true;
      authorizationStatus.textContent = `승인 상태: 승인됨 (v${version})`;
      authorizationStatus.style.backgroundColor = "rgba(0, 128, 0, 0.7)";
      statusText.textContent = "저장된 승인 정보로 시작 가능합니다.";
    }
  }
}

// 화면 보호기 방지 함수
function startKeepAwake() {
  if (keepAwakeTimer) {
    return; // 이미 실행 중이면 중복 실행 방지
  }
  
  console.log("화면 보호기 방지 기능 시작");
  
  // 보이지 않는 1x1 픽셀 캔버스 생성
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  canvas.id = 'keepAwakeCanvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '-1px';
  canvas.style.left = '-1px';
  canvas.style.opacity = '0.01'; // 완전히 투명하지 않고 거의 보이지 않게
  document.body.appendChild(canvas);
  
  // 주기적으로 캔버스에 미세한 변화 주기
  keepAwakeTimer = setInterval(() => {
    if (!isActive) {
      stopKeepAwake();
      return;
    }
    
    try {
      // 캔버스에 무작위 색상으로 픽셀 그리기
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const color = `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
      }
      
      // 페이지 타이틀에 공백 문자 추가/제거 (눈에 보이지 않음)
      const title = document.title;
      document.title = title.endsWith(' ') ? title.slice(0, -1) : title + ' ';
      
      // 추가: 키보드 이벤트 발생 (탭 키 - 포커스 변경 없이 눈에 띄지 않음)
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        keyCode: 9,
        which: 9,
        bubbles: true,
        composed: true
      }));
      
      // 추가: 스크롤 이벤트 (1px만 스크롤하여 거의 눈에 띄지 않음)
      window.scrollBy(0, 1);
      setTimeout(() => window.scrollBy(0, -1), 100);
    } catch (e) {
      console.error("화면 보호기 방지 중 오류:", e);
    }
  }, 60000); // 1분마다 실행
}

// 화면 보호기 방지 중지 함수
function stopKeepAwake() {
  if (keepAwakeTimer) {
    clearInterval(keepAwakeTimer);
    keepAwakeTimer = null;
    
    // 캔버스 요소 제거
    const canvas = document.getElementById('keepAwakeCanvas');
    if (canvas) {
      canvas.remove();
    }
    
    console.log("화면 보호기 방지 기능 중지");
  }
}

// 최소화/최대화 토글 함수
function toggleMinimize() {
  if (!isMinimized) {
    // 최소화
    isMinimized = true;
    minimizeButton.textContent = "최대화";
    
    // 상태 텍스트와 카운트다운 숨기기
    authorizationStatus.style.display = "none";
    statusText.style.display = "none";
    countdownDisplay.style.display = "none";
    
    // 컨트롤 패널 크기 조정
    controlPanel.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    controlPanel.style.padding = "5px";
    controlPanel.style.borderRadius = "4px";
    
    // 시작/중지 버튼만 표시하고 나머지 버튼 숨기기
    Array.from(controlPanel.querySelectorAll("button")).forEach(btn => {
      if (btn !== minimizeButton) {
        btn.style.display = "none";
      }
    });
    
    // 최소화 버튼 위치 조정
    minimizeButton.style.padding = "5px 10px";
    minimizeButton.style.fontSize = "6px";
    
    // 활성화 상태 표시
    if (isActive) {
      controlPanel.style.border = "2px solid #4CAF50";
    }
  } else {
    // 최대화
    isMinimized = false;
    minimizeButton.textContent = "최소화";
    
    // 상태 텍스트 다시 표시
    authorizationStatus.style.display = "block";
    statusText.style.display = "block";
    if (isActive) {
      countdownDisplay.style.display = "block";
    }
    
    // 컨트롤 패널 원래대로 복원
    controlPanel.style.backgroundColor = "";
    controlPanel.style.padding = "";
    controlPanel.style.border = "";
    controlPanel.style.borderRadius = "";
    
    // 모든 버튼 다시 표시
    Array.from(controlPanel.querySelectorAll("button")).forEach(btn => {
      btn.style.display = "block";
    });
    
    // 최소화 버튼 원래대로 복원
    minimizeButton.style.padding = "4px 7px";
    minimizeButton.style.fontSize = "7px";
  }
}

// 자동 클릭 토글 (시작/중지)
function toggleAutoClick() {
  if (!isActive) {
    // 시작
    isActive = true;
    startButton.textContent = "클릭 중지";
    startButton.style.backgroundColor = "#f44336";
    statusText.textContent = "10초 간격 클릭 실행 중";
    if (!isMinimized) {
      statusText.style.display = "block";
    }
    
    // 최소화 상태에서 활성화 표시
    if (isMinimized) {
      controlPanel.style.border = "2px solid #4CAF50";
    }
    
    // 화면 보호기 방지 기능 시작
    startKeepAwake();
    
    // 즉시 한 번 실행
    executeClickSequence();
    
    // 반복 타이머 시작
    runAutoClicker();
  } else {
    // 중지
    stopAutoClicker(); // 타이머 정리 함수 호출
    
    // 화면 보호기 방지 기능 중지
    stopKeepAwake();
    
    // UI 업데이트
    isActive = false;
    startButton.textContent = "10초 간격 클릭 시작";
    startButton.style.backgroundColor = "#4CAF50";
    statusText.textContent = "대기 중";
    countdownDisplay.style.display = "none";
    
    // 최소화 상태에서 비활성화 표시
    if (isMinimized) {
      controlPanel.style.border = "";
    }
  }
}

// 타이머 중지 및 정리 함수
function stopAutoClicker() {
  // 카운트다운 타이머 정리
  if (countdown) {
    clearTimeout(countdown);
    countdown = null;
  }
  
  // 클릭 타이머 정리
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }
}

// 자동 클릭 실행 함수
function runAutoClicker() {
  if (!isActive) return;
  
  // 이전 타이머 정리
  stopAutoClicker();
  
  // 카운트다운 시작
  let timeLeft = 10; // 10초 간격
  
  // 카운트다운 표시
  if (!isMinimized) {
    countdownDisplay.style.display = "block";
  }
  countdownDisplay.textContent = `다음 클릭까지 ${timeLeft}초`;
  
  // 1초마다 카운트다운 업데이트
  const updateCountdown = () => {
    if (!isActive) return;
    
    timeLeft--;
    countdownDisplay.textContent = `다음 클릭까지 ${timeLeft}초`;
    
    if (timeLeft <= 0) {
      // 클릭 시퀀스 실행 (승인 상태 확인 제거 - 이미 확인됨)
      executeClickSequence();
      
      // 새로운 타이머 시작 (0.5초 후에)
      clickTimer = setTimeout(() => {
        if (isActive) runAutoClicker();
      }, 500);
    } else {
      // 1초 후 다시 업데이트
      countdown = setTimeout(updateCountdown, 1000);
    }
  };
  
  // 카운트다운 시작
  countdown = setTimeout(updateCountdown, 1000);
}

// 클릭 시퀀스 실행 함수 (움직이는 요소 찾고 클릭 후 다음 버튼 클릭)
function executeClickSequence() {
  statusText.textContent = "움직이는 요소 찾는 중...";
  
  // 움직이는 요소 찾기 및 결과에 따른 콜백 처리
  findAndClickMovingElement((movingElementFound) => {
    setTimeout(() => {
      if (movingElementFound) {
        statusText.textContent = "움직이는 요소 클릭 성공, 다음 버튼 클릭 중...";
      } else {
        statusText.text