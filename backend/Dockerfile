# --- Build aşaması ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Önce sadece pom.xml kopyalanır ki bağımlılıklar katman olarak cache'lensin —
# kaynak kodu değiştiğinde bağımlılıkları yeniden indirmeye gerek kalmaz.
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# --- Çalışma aşaması ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
