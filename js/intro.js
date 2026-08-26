const CUTS = [
  {
    src: 'assets/intro1.jpg',
    alt: '거울 앞에 선 왕비',
    html: '왕비는 백설공주를 시기했습니다.',
  },
  {
    src: 'assets/intro2.jpg',
    alt: '노파로 변장해 일곱난쟁이 집에 찾아온 왕비',
    html: '노파로 모습을 바꾸어<br>일곱난쟁이의 집을 찾아왔습니다.',
  },
  {
    src: 'assets/intro3.jpg',
    alt: '사과를 먹고 쓰러진 백설공주',
    html: '사과를 한 입 베어 문 순간,<br>백설공주가 쓰러졌습니다.',
  },
  {
    src: 'assets/intro4.jpg',
    alt: '돌아온 일곱난쟁이',
    html: '<b>사과를 모두 없애야<br>공주를 살릴 수 있다!</b>',
  },
];

export function startIntro(onDone) {
  const screen = document.getElementById('screen-intro');
  const img = document.getElementById('intro-image');
  const cap = document.getElementById('intro-caption');
  const dots = document.getElementById('intro-dots');
  const skip = document.getElementById('intro-skip');

  dots.replaceChildren(...CUTS.map(() => document.createElement('i')));

  let idx = 0;
  let finished = false;

  function show(i) {
    const cut = CUTS[i];
    img.src = cut.src;
    img.alt = cut.alt;
    cap.innerHTML = cut.html;
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  }

  function onSkip(ev) {
    ev.stopPropagation();
    finish();
  }

  function finish() {
    if (finished) return;
    finished = true;
    skip.removeEventListener('click', onSkip);
    screen.removeEventListener('click', next);
    document.removeEventListener('keydown', onKey);
    onDone();
  }

  function next() {
    idx += 1;
    if (idx >= CUTS.length) finish();
    else show(idx);
  }

  function onKey(ev) {
    if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      next();
    } else if (ev.key === 'Escape') {
      finish();
    }
  }

  // 건너뛰기는 화면 넘기기로 새지 않게 막는다
  skip.addEventListener('click', onSkip);
  screen.addEventListener('click', next);
  document.addEventListener('keydown', onKey);

  // 다음 컷을 미리 받아 둔다
  for (const cut of CUTS.slice(1)) new Image().src = cut.src;

  show(0);
}
