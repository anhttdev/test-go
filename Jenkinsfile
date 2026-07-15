pipeline {
    agent any

    environment {
    APP_NAME = 'test-golang'
    DOCKER_HUB_USER = 'tuananhtrinh' // !!! Thay bằng username Docker Hub thực tế của bạn
    IMAGE_NAME = "${DOCKER_HUB_USER}/${APP_NAME}"
    DB_HOST = 'postgres-db'
    DB_PORT = '5432'
    DB_USER = 'root'
    DB_NAME = 'test-golang'
    DB_SSLMODE = 'disable'
    REDIS_HOST = 'redis-cache'
    REDIS_PORT = '6379'
    RABBITMQ_URL= 'amqp://guest:guest@rabbitmq:5672/'
    DB_PASSWORD = credentials('db-password')
    ACCESS_SECRET_KEY = credentials('jwt-access-secret')
    REFRESH_SECRET_KEY = credentials('jwt-refresh-secret')
    }
    stages {
        stage {
            steps {
            git branch: 'main', credentialsId: 'github-credentials', url: 'https://github.com/anhttdev/go.git'
            }
        }

        stage("Chuan bi moi truong .env") {
            steps {
                echo 'Dang tao file .env'
                sh '''
            cat<<EOF > .env
            DB_HOST=${DB_HOST}
            DB_PORT=${DB_PORT}
            DB_USER=${DB_USER}
            DB_PASSWORD=${DB_PASSWORD}
            DB_NAME=${DB_NAME}
            DB_SSLMODE=${DB_SSLMODE}
            access_secret_key=${ACCESS_SECRET_KEY}
            refresh_secret_key=${REFRESH_SECRET_KEY
            REDIS_HOST=${REDIS_HOST}
            REDIS_PORT=${REDIS_PORT}
            rabbitMQ_url=${RABBITMQ_URL}
            EOF
            '''
             }
        }

    stage ("Bien dich va kiem thu") {
        agent {
            docker {
                image 'golang:1.26-alpine'
                args '-u root:root'
                reuseNode true
                }
            }
        environment {
        CGO_DISABLED = 0
        GOOS = 'linux'
        }
        steps {
            echo 'Đang tải thư viện và biên dịch ứng dụng...'
            sh 'go mod tidy'

            dir('cmd/api') {
            sh 'go build -a -installsuffix cgo -o test-golang-2 ./main.go'
            }
        }
    }

    stage ("Dong goi docker image") {
        steps {
            echo "Đóng gói file binary vào Docker Image phiên bản ${BUILD_NUMBER} "
            sh "docker build -t ${IMAGE_NAME}:latest -t ${IMAGE_NAME}:{BUILD_NUMBER}"
        }
    }

    stage ("Day len docker hub") {
        steps {
            withCredentials([usernamePassword(credentialsId:'docker-hub-credentials', passwordVariable:'DOCKER_PASS',
            usernameVariable: 'DOCKER_USER')]) {
                sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                sh "docker push ${IMAGE_NAME}:${BUILD_NUMBER}"
                sh "docker push ${IMAGE_NAME}:latest"
                sh 'docker logout'
                }
        }
    }
    }

    post {
        always {
            sh 'rm -f .env'
            sh "rm -f ${APP_NAME}"
            clear Ws()
            }
        success {
        echo "✅ Xuất sắc! Ứng dụng Go đã sẵn sàng tại: ${IMAGE_NAME}:${BUILD_NUMBER}"
            }
        failure {
        echo "❌ Quy trình gặp lỗi. Hãy kiểm tra lại log."
            }
        }

}