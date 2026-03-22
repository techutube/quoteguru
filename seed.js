const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/Quoteguru';

async function seed() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const userExists = await db.collection('users').findOne({ email: 'admin@tata.com' });
    if (!userExists) {
      await db.collection('users').insertOne({
        name: 'Admin User',
        email: 'admin@tata.com',
        passwordHash: 'admin123', // Keeping it simple per schema logic
        role: 'Admin',
        isActive: true,
        createdAt: new Date()
      });
      console.log('Admin user created successfully! Email: admin@tata.com, Password: admin123');
    } else {
      console.log('Admin user already exists! Email: admin@tata.com, Password: admin123');
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

seed();
