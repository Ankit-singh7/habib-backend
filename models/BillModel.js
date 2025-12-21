const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productDetail  = {
    type: String
}

let billSchema = new Schema(
    {

        bill_id:{
            type: String,
            default: '',
            index: true,
            unique: true
        },
        token_id:{
            type:String,
            default:'' 
        },
        user_name: {
          type:String,
          default:''
        },
        user_id: {
            type:String,
            default:''
        },
        customer_name: {
            type:String,
            default:''
        },
        customer_phone: {
            type:Number,
            default:null
        },
        customer_alternative_phone:{
            type:Number,
            default:null
        },
        customer_address: {
            type: String,
            default:''
        },
        dob: {
            type:String,
            default:''
        },
        feedback: {
            type:String,
            default:''
        },
        anniversary: {
            type:String,
            default:''
        },
        dual_payment_mode:{
            type:String,
            default:''
        },
        payment_mode: {
            type:String,
            default:''
        },
        payment_mode_2: {
            type:String,
            default:''
        },
        split_amount_1:{
            type:Number,
            default:null
        },
        split_amount_2:{
            type:Number,
            default:null
        },
        branch_id:{
            type:String,
            default:''
        },
        branch_name: {
            type:String,
            default:''
        },
        total_price: {
            type: Number,
            default:null
        },
        booking_amount:{
            type: Number,
            default:null
        },
        amount_to_be_paid:{
            type: Number,
            default:null
        },
        service_amount: {
            type: Number,
            default:null
        },
        products: [
            {
               product_name: {
                type:String,
                default:''
               },
               product_id: {
                type:String,
                default:''
               },
               quantity:{
                   type:Number,
                   default:null
               },
               employee_id:{
                type:String,
                default:''
              },
              employee_name:{
                type:String,
                default:''
              },
              total:{
                type:Number,
                default:null
              }
            }
        ],
        services: [
            {
                service_name: {
                 type:String,
                 default:''
                },
                service_id: {
                 type:String,
                 default:''
                },
                quantity:{
                    type:Number,
                    default:null
                },
                employee_id:{
                    type:String,
                    default:''
                },
                employee_name:{
                    type:String,
                    default:''
                },
                total:{
                    type:Number,
                    default:null
                },
                product_usage_detail: [
                    {
                        name: {
                            type: String,
                            default: ''
                        },
                        product_id: {
                            type: String,
                            default: ''
                        },
                        quantity: {
                            type: String,
                            default: null
                        },
                        brand_id: {
                            type: String,
                            default: ''
                        }
                    }
                ]
             } 
        ],
        date:{
            type:String,
            default:''
        },
        createdOn :{
            type:Date,
            default:''
          }
    }
)

mongoose.model('bill', billSchema);
