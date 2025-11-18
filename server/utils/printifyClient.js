const axios = require('axios');

class PrintifyClient {
  constructor() {
    this.baseURL = 'https://api.printify.com/v1';
    this.shopId = process.env.PRINTIFY_SHOP_ID;
    this.apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!this.apiToken || !this.shopId) {
      console.warn('⚠️  Printify credentials not configured. Set PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID in .env file');
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  async getProducts() {
    try {
      const response = await axios.get(
        `${this.baseURL}/shops/${this.shopId}/products.json`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching products from Printify:', error.response?.data || error.message);
      throw error;
    }
  }

  async getProduct(productId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/shops/${this.shopId}/products/${productId}.json`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching product from Printify:', error.response?.data || error.message);
      throw error;
    }
  }

  async createOrder(orderData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/shops/${this.shopId}/orders.json`,
        orderData,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating order in Printify:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendToProduction(orderId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/shops/${this.shopId}/orders/${orderId}/send_to_production.json`,
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending order to production:', error.response?.data || error.message);
      throw error;
    }
  }

  async calculateShipping(orderData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/shops/${this.shopId}/orders/shipping.json`,
        orderData,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error calculating shipping:', error.response?.data || error.message);
      throw error;
    }
  }

  async getOrder(orderId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/shops/${this.shopId}/orders/${orderId}.json`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new PrintifyClient();
