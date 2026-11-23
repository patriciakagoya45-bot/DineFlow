require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');

const localImagePath = name => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `images/dishes/${slug}.jpg`;
};

const referenceMenu = [
    {
        name: 'Classic Salted Fries',
        category: 'Snacks',
        price: 16200,
        preparationTime: 10,
        description: 'Golden fries lightly seasoned with salt.',
        image: localImagePath('Classic Salted Fries')
    },
    {
        name: 'Classic Margherita',
        category: 'Pizza',
        price: 46440,
        preparationTime: 20,
        description: 'Classic Margherita pizza with tomato, mozzarella and basil.',
        image: localImagePath('Classic Margherita')
    },
    {
        name: 'Caramel Macchiato',
        category: 'Coffee',
        price: 19800,
        preparationTime: 7,
        description: 'Espresso, steamed milk and caramel.',
        image: localImagePath('Caramel Macchiato')
    },
    {
        name: 'Double Cheese Smash',
        category: 'Burgers',
        price: 32400,
        preparationTime: 18,
        description: 'Double beef smash burger with melted cheese.',
        image: localImagePath('Double Cheese Smash')
    },
    {
        name: 'Battered Onion Rings',
        category: 'Snacks',
        price: 18000,
        preparationTime: 10,
        description: 'Crispy battered onion rings.',
        image: localImagePath('Battered Onion Rings')
    },
    {
        name: 'Fried Chicken Blast',
        category: 'Chicken',
        price: 54000,
        preparationTime: 20,
        description: 'Crispy fried chicken served with fries.',
        image: localImagePath('Fried Chicken Blast')
    }
];

const imageByCategory = {
    'Beverages': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80',
    'Demo Menu': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
    'Desserts': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80',
    'Drinks': 'https://images.unsplash.com/photo-1513558161293-cdaf765edfd4?auto=format&fit=crop&w=900&q=80',
    'Main Course': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80',
    'Main Dishes': 'https://images.unsplash.com/photo-1519708227418-c8fd9a9d0d80?auto=format&fit=crop&w=900&q=80',
    'Smoothies': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=900&q=80'
};

const imageByName = {
    'Avocado Banana Smoothie': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=80',
    'Berry Yogurt Smoothie': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=80',
    'Beef Pilau': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
    'Caramel Banana Sundae': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80',
    'Chicken Shawarma Plate': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=80',
    'Chocolate Fudge Cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
    'Demo Beef Wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80',
    'Demo Garden Bowl': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    'Demo Grilled Chicken': 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80',
    'Demo Mango Juice': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80',
    'Demo Veggie Pasta': 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
    'Fresh Passion Juice': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80',
    'Mango Pineapple Smoothie': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=900&q=80',
    'Pan-Seared Tilapia': 'https://images.unsplash.com/photo-1519708227418-c8fd9a9d0d80?auto=format&fit=crop&w=900&q=80',
    'Vanilla Cheesecake': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80'
};

async function seedReferenceMenu() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing from the .env file.');
    }

    await mongoose.connect(process.env.MONGO_URI);

    for (const dish of referenceMenu) {
        let category = await Category.findOne({ name: dish.category });
        if (!category) {
            category = await Category.create({
                name: dish.category,
                description: `Dishes in ${dish.category.toLowerCase()}.`
            });
        }

        await MenuItem.findOneAndUpdate(
            { name: dish.name },
            {
                $set: {
                    name: dish.name,
                    description: dish.description,
                    category: category._id,
                    price: dish.price,
                    image: dish.image,
                    availability: 'available',
                    preparationTime: dish.preparationTime
                }
            },
            {
                upsert: true,
                returnDocument: 'after',
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );
    }

    const existingItems = await MenuItem.find();
    let imagesAdded = 0;
    for (const item of existingItems) {
        const localImage = localImagePath(item.name);
        const localImageFile = path.join(__dirname, '..', 'frontend', localImage);
        if (fs.existsSync(localImageFile)) {
            if (item.image !== localImage) {
                item.image = localImage;
                await item.save();
                imagesAdded += 1;
            }
            continue;
        }
        if (item.image) continue;

        const category = await Category.findById(item.category).select('name');
        const image = imageByName[item.name] || imageByCategory[category?.name];
        if (!image) continue;

        item.image = image;
        await item.save();
        imagesAdded += 1;
    }

    console.log(
        `Reference menu is ready: ${referenceMenu.length} dishes upserted, ${imagesAdded} existing dish images added. Reference prices use UGX at 3,600 per USD.`
    );
}

seedReferenceMenu()
    .catch(error => {
        console.error(`Unable to seed reference menu: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });