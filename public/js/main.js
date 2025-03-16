// main.js - 메인 페이지 자바스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 헤더 스크롤 이벤트
    const header = document.getElementById('header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 0) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 모바일 메뉴 토글
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            mainNav.classList.toggle('active');
        });
    }

    // 메인 슬라이더
    const slides = document.querySelectorAll('.slide');
    const navDots = document.querySelectorAll('.slider-nav span');
    const prevBtn = document.querySelector('.slider-btn.prev');
    const nextBtn = document.querySelector('.slider-btn.next');
    let currentSlide = 0;
    let slideInterval;

    // 슬라이드 변경 함수
    function changeSlide(n) {
        slides[currentSlide].classList.remove('active');
        navDots[currentSlide].classList.remove('active');
        
        currentSlide = (n + slides.length) % slides.length;
        
        slides[currentSlide].classList.add('active');
        navDots[currentSlide].classList.add('active');
    }

    // 자동 슬라이드 시작
    function startSlideInterval() {
        slideInterval = setInterval(() => {
            changeSlide(currentSlide + 1);
        }, 6000);
    }

    // 초기 슬라이드 설정
    startSlideInterval();

    // 이전 버튼 클릭
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            clearInterval(slideInterval);
            changeSlide(currentSlide - 1);
            startSlideInterval();
        });
    }

    // 다음 버튼 클릭
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            clearInterval(slideInterval);
            changeSlide(currentSlide + 1);
            startSlideInterval();
        });
    }

    // 내비게이션 닷 클릭
    if (navDots) {
        navDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                clearInterval(slideInterval);
                changeSlide(index);
                startSlideInterval();
            });
        });
    }

    // 제품 캐러셀
    const productCards = document.querySelectorAll('.product-card');
    const productPrevBtn = document.querySelector('.carousel-nav .prev-btn');
    const productNextBtn = document.querySelector('.carousel-nav .next-btn');
    let currentProduct = 0;

    function changeProduct(n) {
        const carousel = document.querySelector('.product-carousel');
        currentProduct = (n + productCards.length) % productCards.length;
        const offset = -currentProduct * 100;
        carousel.style.transform = `translateX(${offset}%)`;
    }

    if (productPrevBtn) {
        productPrevBtn.addEventListener('click', () => {
            changeProduct(currentProduct - 1);
        });
    }

    if (productNextBtn) {
        productNextBtn.addEventListener('click', () => {
            changeProduct(currentProduct + 1);
        });
    }

    // 최신 공지사항 로드
    loadLatestNews();

    // 언어 전환
    const langButtons = document.querySelectorAll('.language-selector a');
    if (langButtons) {
        langButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const lang = this.getAttribute('data-lang');
                
                // 활성화된 언어 변경
                document.querySelectorAll('.language-selector a').forEach(el => {
                    el.classList.remove('active');
                });
                this.classList.add('active');
                
                // 언어 쿠키 설정
                document.cookie = `lang=${lang}; path=/; max-age=3600`;
                
                // 임시: 언어 전환 알림
                alert(`언어가 ${lang === 'ko' ? '한국어' : '영어'}로 변경되었습니다.`);
            });
        });
    }
});

// 최신 공지사항 로드 함수
function loadLatestNews() {
    const newsList = document.getElementById('main-news-list');
    if (!newsList) return;

    // API에서 데이터를 가져옴
    fetch('/api/notices?limit=3')
        .then(response => response.json())
        .then(data => {
            newsList.innerHTML = '';
            data.notices.forEach(notice => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="notice-detail.html?id=${notice._id}">
                        <span class="news-title">${notice.title}</span>
                        <span class="news-date">${formatDate(notice.createdAt)}</span>
                    </a>
                `;
                newsList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('공지사항을 불러오는 중 오류가 발생했습니다:', error);
            
            // 오류 시 임시 데이터 표시
            newsList.innerHTML = `
                <li>
                    <a href="notice-detail.html?id=10">
                        <span class="news-title">(주)산들네트웍스 30기(2023년)결산재무제표</span>
                        <span class="news-date">2024.08.14</span>
                    </a>
                </li>
                <li>
                    <a href="notice-detail.html?id=9">
                        <span class="news-title">(주)산들네트웍스 29기(2022년)결산재무제표</span>
                        <span class="news-date">2023.05.02</span>
                    </a>
                </li>
                <li>
                    <a href="notice-detail.html?id=8">
                        <span class="news-title">(주)산들네트웍스 28기(2021년)결산재무제표</span>
                        <span class="news-date">2022.05.17</span>
                    </a>
                </li>
            `;
        });
}

// 날짜 형식 변환 함수
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}