# [공부용 주석 가이드]

# 1. 베이스 이미지 선택
# registry.access.redhat.com/ubi9/nodejs-20: Red Hat에서 제공하는 보안이 강화된(UBI) Node.js 20 이미지입니다.
# 오픈시프트(OpenShift) 환경에서는 보통 이 계열의 이미지를 사용하는 것이 표준입니다.
FROM registry.access.redhat.com/ubi9/nodejs-20:latest

# 2. 작업 디렉토리 설정
# 컨테이너 내부에서 커맨드가 실행될 기본 디렉토리를 지정합니다.
# Red Hat 기반 Node.js 이미지의 권장 경로는 /opt/app-root/src 입니다.
WORKDIR /opt/app-root/src

# 3. 의존성 파일 복사 및 설치
# package.json과 package-lock.json만 먼저 복사하여 'npm install'을 실행합니다.
# 이렇게 하면 소스 코드가 바뀌어도 라이브러리가 그대로면 이 단계를 캐싱하여 빌드 속도가 빨라집니다.
COPY package*.json ./
RUN npm install

# 4. 전체 프로젝트 소스 코드 복사
# 현재 로컬에 있는 모든 파일(Dockerfile 제외)을 컨테이너 내부로 복사합니다.
COPY . .

# 5. 포트 설정 (문서화 용도)
# 이 컨테이너가 3001번 포트를 사용할 것임을 명시합니다. (package.json의 설정과 일치해야 함)
EXPOSE 3001

# 6. 실행 명령 (Entrypoint)
# 컨테이너가 기동될 때 실제로 서버를 실행하는 명령어입니다 (npm start -> node server.js).
CMD ["npm", "start"]
