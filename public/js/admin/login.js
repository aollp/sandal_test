// login.js - 관리자 로그인 스크립트
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    
    // 로그인 상태 확인
    checkLoginStatus();
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showError('아이디와 비밀번호를 입력해주세요.');
                return;
            }
            
            // 로그인 요청
            login(username, password);
        });
    }
    
    // 로그인 함수
    function login(username, password) {
        fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 로그인 성공
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // 관리자 대시보드로 이동
                window.location.href = '/admin/index.html';
            } else {
                // 로그인 실패
                showError(data.error || '로그인에 실패했습니다.');
            }
        })
        .catch(error => {
            console.error('로그인 오류:', error);
            showError('서버 오류가 발생했습니다. 나중에 다시 시도해주세요.');
        });
    }
    
    // 에러 메시지 표시
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // 3초 후 메시지 숨김
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
    
    // 로그인 상태 확인
    function checkLoginStatus() {
        const token = localStorage.getItem('token');
        
        if (token) {
            // 토큰 유효성 검사
            fetch('/api/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (response.ok) {
                    // 이미 로그인된 상태면 대시보드로 이동
                    window.location.href = '/admin/index.html';
                }
            })
            .catch(error => {
                console.error('토큰 검증 오류:', error);
                // 토큰 오류 시 로컬 스토리지 비우기
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            });
        }
    }
});