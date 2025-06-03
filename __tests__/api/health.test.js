import express from 'express';
import request from 'supertest';

describe('Health Endpoint', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    // Add the health endpoint to the app
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });
  });

  test('should return 200 OK with status ok', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});