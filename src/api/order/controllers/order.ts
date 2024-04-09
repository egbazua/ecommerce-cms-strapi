/**
 * order controller
 */

import { factories } from '@strapi/strapi'
import { Stripe } from 'stripe'

const stripe = new Stripe(process.env.STRIPE_KEY)

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body

    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi.service('api::product.product').findOne(product.id)

          return {
            price_data: {
              currency: "mxn",
              product_data: {
                name: item.productName
              },
              unit_amount: Math.round(item.price * 100)
            },
            quantity: 1
          }
        })
      )

      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: { allowed_countries: ['MX'] },
        payment_method_types: ["card"],
        mode: "payment",
        success_url: process.env.CLIENT_URL + '/success',
        cancel_url: process.env.CLIENT_URL + '/success-error',
        line_items: lineItems
      })

      await strapi
        .service("api::order.order")
        .create({data: {products, stripeId: session.id}});
    
      return { stripeSession: session }
    } catch (error) {
      ctx.response.status = 500

      return { error }
    }
  }
}))
