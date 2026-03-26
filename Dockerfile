# [공부용 주석 가이드 - 권한 수정 버전]

# 1. 베이스 이미지 선택 (RHEL 9 기반 Node.js 20)
FROM registry.access.redhat.com/ubi9/nodejs-20:latest

# 2. 작업 디렉토리 설정
WORKDIR /opt/app-root/src

# 3. 의존성 파일 복사 (권한 설정 추가)
# --chown=1001:0 옵션을 붙여서 파일 소유권을 1001번 사용자(nodejs)와 0번 그룹(root)으로 설정합니다.
# 오픈시프트는 보안상 랜덤한 사용자로 실행되는데, 그룹이 0(root)이어야 파일 수정 권한이 생깁니다.
COPY --chown=1001:0 package*.json ./

# 4. 의존성 설치
RUN npm install

# 5. 전체 소스는 나중에 복사 (빌드 효율성 위해)
COPY --chown=1001:0 . .

# 6. 포트 및 실행 명령
EXPOSE 3001
CMD ["npm", "start"]
