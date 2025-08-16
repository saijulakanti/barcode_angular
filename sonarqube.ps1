$env:SONAR_HOST_URL = "http://localhost:9000"
$env:SONAR_TOKEN = "squ_8e5f41ff8a9886aca0ab7fd41643c2096c4acf57"
$env:JAVA_HOME="C:\Program Files\Java\jdk-17"

# ng test --code-coverage --watch=false
npx sonar-scanner
