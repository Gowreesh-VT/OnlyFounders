const { MongoClient } = require('mongodb');

async function createClusters() {
    const uri = 'mongodb+srv://gowreesh:qavbak-3geshu-vadVit@onlyfounders.newnnkk.mongodb.net/onlyfounders?retryWrites=true&w=majority';
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('onlyfounders');
        const clusters = db.collection('clusters');
        
        const clusterNames = ['Cluster A', 'Cluster B', 'Cluster C', 'Cluster D', 'Cluster E'];
        
        for (const name of clusterNames) {
            const existing = await clusters.findOne({ name });
            if (existing) {
                console.log('⚠️  Already exists:', name);
            } else {
                await clusters.insertOne({
                    name,
                    teams: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log('✅ Created:', name);
            }
        }
        
        console.log('\nDone! Created clusters.');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.close();
    }
}

createClusters();
