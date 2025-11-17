import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita CORS 
  app.enableCors({
    origin: 'http://localhost:5173', // URL del frontend React
    credentials: true,               // Auth
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Servidor corriendo en: http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
