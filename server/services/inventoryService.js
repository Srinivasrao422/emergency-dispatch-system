/**
 * InventoryService — Phase 9 Inventory & Spare-Part Tracking
 * 
 * Provides:
 * - Centralized emergency material catalog with category categorization and low-stock alerts
 * - Transactional stock deduction upon confirmed field usage
 * - Quantity validation preventing unauthorized negative inventory
 * - Idempotency protection against duplicate material consumption and double charging
 * - Complete stock adjustment and audit history (InventoryTransaction)
 * - Seamless financial synchronization with authoritative service invoices
 */

export class InventoryService {
  constructor(options = {}) {
    this.prisma = options.prisma || null;
    this.dispatchEngine = options.dispatchEngine || null;
    this.dbService = options.dbService || null;
    this.io = options.io || null;

    this.processedTxKeys = new Set();
    this.inMemoryItems = new Map(); // itemId -> item
    this.inMemoryTransactions = []; // array of transactions
    this.inMemoryJobMaterials = []; // array of job materials

    this.seedDefaultCatalog();
  }

  setDependencies({ prisma, dispatchEngine, dbService, io }) {
    if (prisma) this.prisma = prisma;
    if (dispatchEngine) this.dispatchEngine = dispatchEngine;
    if (dbService) this.dbService = dbService;
    if (io) this.io = io;
  }

  /**
   * Seeds default emergency replacement parts into memory and database.
   */
  async seedDefaultCatalog() {
    const defaultCatalog = [
      // Plumbing
      {
        id: 'item_plumb_01',
        sku: 'PIPE-PVC-01',
        name: 'Heavy-Duty PVC Pressure Pipe 1-inch (3m)',
        category: 'Plumbing',
        unitPrice: 320.0,
        stockQuantity: 65,
        minThreshold: 15,
        unit: 'length',
        description: 'Schedule 40 cold-water high pressure rated PVC pipe.'
      },
      {
        id: 'item_plumb_02',
        sku: 'VALVE-BRASS-01',
        name: 'High-Pressure Brass Ball Valve 3/4-inch',
        category: 'Plumbing',
        unitPrice: 450.0,
        stockQuantity: 42,
        minThreshold: 10,
        unit: 'piece',
        description: 'Full port forged brass emergency shutoff ball valve.'
      },
      {
        id: 'item_plumb_03',
        sku: 'SEAL-TAPE-01',
        name: 'Industrial Teflon Thread Seal Tape',
        category: 'Plumbing',
        unitPrice: 65.0,
        stockQuantity: 140,
        minThreshold: 25,
        unit: 'roll',
        description: 'High-density PTFE thread seal tape for pressurized joints.'
      },
      {
        id: 'item_plumb_04',
        sku: 'TRAP-DRAIN-01',
        name: 'Anti-Siphon Flexible P-Trap Drain Assembly',
        category: 'Plumbing',
        unitPrice: 280.0,
        stockQuantity: 38,
        minThreshold: 10,
        unit: 'kit',
        description: 'Universal sink and basin odor-block drain kit.'
      },

      // Electrical
      {
        id: 'item_elec_01',
        sku: 'MCB-SWITCH-01',
        name: '32A C-Curve Double Pole MCB Breaker',
        category: 'Electrical',
        unitPrice: 580.0,
        stockQuantity: 55,
        minThreshold: 12,
        unit: 'piece',
        description: '10kA breaking capacity thermal-magnetic circuit breaker.'
      },
      {
        id: 'item_elec_02',
        sku: 'WIRE-COPPER-01',
        name: '2.5 sq mm Flame Retardant Copper Cable (10m)',
        category: 'Electrical',
        unitPrice: 420.0,
        stockQuantity: 80,
        minThreshold: 20,
        unit: 'coil',
        description: 'Multi-strand PVC insulated pure electrolytic copper wire.'
      },
      {
        id: 'item_elec_03',
        sku: 'RELAY-AUTO-01',
        name: 'Voltage Surge Protection Contactor Relay',
        category: 'Electrical',
        unitPrice: 750.0,
        stockQuantity: 28,
        minThreshold: 8,
        unit: 'piece',
        description: 'Heavy duty high/low voltage surge cutoff relay.'
      },

      // HVAC / Appliance
      {
        id: 'item_hvac_01',
        sku: 'CAPACITOR-RUN-01',
        name: '45uF Dual Run Heavy Compressor Capacitor',
        category: 'HVAC',
        unitPrice: 620.0,
        stockQuantity: 34,
        minThreshold: 8,
        unit: 'piece',
        description: '450V AC explosion-proof motor start capacitor.'
      },
      {
        id: 'item_hvac_02',
        sku: 'GAS-R32-CAN-01',
        name: 'R-32 Eco Refrigerant Gas Canister (1kg)',
        category: 'HVAC',
        unitPrice: 1250.0,
        stockQuantity: 24,
        minThreshold: 6,
        unit: 'can',
        description: 'Zero ODP pure refrigerant top-up canister.'
      },

      // Locksmith
      {
        id: 'item_lock_01',
        sku: 'CYL-EURO-01',
        name: 'Anti-Snap High-Security Euro Profile Cylinder',
        category: 'Locksmith',
        unitPrice: 890.0,
        stockQuantity: 32,
        minThreshold: 8,
        unit: 'piece',
        description: 'Drill-resistant brass Euro lock cylinder with 3 dimple keys.'
      },
      {
        id: 'item_lock_02',
        sku: 'LATCH-SPRING-01',
        name: 'Reversible Tubular Mortise Door Latch 60mm',
        category: 'Locksmith',
        unitPrice: 340.0,
        stockQuantity: 45,
        minThreshold: 10,
        unit: 'piece',
        description: 'Heavy duty solid brass bolt residential latch.'
      }
    ];

    for (const item of defaultCatalog) {
      this.inMemoryItems.set(item.id, { ...item, isActive: true });
    }

    // Upsert into Supabase PostgreSQL
    if (this.prisma) {
      try {
        for (const item of defaultCatalog) {
          await this.prisma.inventoryItem.upsert({
            where: { sku: item.sku },
            update: {},
            create: {
              id: item.id,
              sku: item.sku,
              name: item.name,
              category: item.category,
              unitPrice: item.unitPrice,
              stockQuantity: item.stockQuantity,
              minThreshold: item.minThreshold,
              unit: item.unit,
              description: item.description,
              isActive: true
            }
          });
        }
      } catch (err) {
        console.warn('[Inventory] Warning syncing default catalog to DB:', err.message);
      }
    }
  }

  /**
   * Retrieves catalog items with optional filtering and low-stock flagging.
   */
  async getItems({ category, search, lowStockOnly = false } = {}) {
    let items = [];

    if (this.prisma) {
      try {
        const where = { isActive: true };
        if (category && category !== 'ALL') where.category = category;
        const dbItems = await this.prisma.inventoryItem.findMany({
          where,
          orderBy: { name: 'asc' }
        });
        if (dbItems.length > 0) items = dbItems;
      } catch (err) {
        console.warn('[Inventory] DB query fallback to memory:', err.message);
      }
    }

    if (items.length === 0) {
      items = Array.from(this.inMemoryItems.values()).filter((i) => i.isActive);
      if (category && category !== 'ALL') {
        items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
      }
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
      );
    }

    // Annotate low-stock alerts
    items = items.map((item) => ({
      ...item,
      isLowStock: item.stockQuantity <= item.minThreshold
    }));

    if (lowStockOnly) {
      items = items.filter((i) => i.isLowStock);
    }

    return items;
  }

  /**
   * Adjusts stock quantity transactionally with audit history.
   */
  async adjustStock({ itemId, quantityDelta, transactionType, reason = '', technicianId = null, requestId = null, idempotencyKey = null }) {
    if (!itemId) return { success: false, error: 'Item ID is required.' };
    if (quantityDelta === 0) return { success: false, error: 'Quantity delta cannot be zero.' };

    // Idempotency check
    if (idempotencyKey && this.processedTxKeys.has(idempotencyKey)) {
      return {
        success: true,
        message: 'Inventory transaction already processed (idempotent).',
        idempotent: true
      };
    }

    // Find item in memory or DB
    let item = this.inMemoryItems.get(itemId);
    if (!item && this.prisma) {
      item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    }

    if (!item) {
      return { success: false, error: `Inventory item ${itemId} not found.` };
    }

    const previousStock = item.stockQuantity;
    const newStock = previousStock + quantityDelta;

    // Strict non-negative inventory policy
    if (newStock < 0) {
      return {
        success: false,
        error: `Insufficient stock for ${item.name}. Available: ${previousStock}, Requested deduction: ${Math.abs(quantityDelta)}.`,
        availableStock: previousStock,
        requestedDelta: quantityDelta
      };
    }

    // Update item stock
    item.stockQuantity = newStock;
    this.inMemoryItems.set(item.id, item);

    const txId = `inv_tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const txRecord = {
      id: txId,
      itemId: item.id,
      transactionType: transactionType || (quantityDelta < 0 ? 'USAGE' : 'RESTOCK'),
      quantityDelta,
      previousStock,
      newStock,
      unitPrice: item.unitPrice,
      requestId,
      technicianId,
      reason: reason || `Stock adjusted by ${quantityDelta} units`,
      idempotencyKey,
      createdAt: new Date().toISOString()
    };
    this.inMemoryTransactions.unshift(txRecord);

    if (idempotencyKey) {
      this.processedTxKeys.add(idempotencyKey);
    }

    // Persist to PostgreSQL in atomic transaction
    if (this.prisma) {
      try {
        await this.prisma.$transaction([
          this.prisma.inventoryItem.update({
            where: { id: item.id },
            data: { stockQuantity: newStock }
          }),
          this.prisma.inventoryTransaction.create({
            data: {
              id: txId,
              itemId: item.id,
              transactionType: txRecord.transactionType,
              quantityDelta,
              previousStock,
              newStock,
              unitPrice: item.unitPrice,
              requestId,
              technicianId,
              reason: txRecord.reason,
              idempotencyKey
            }
          })
        ]);
      } catch (err) {
        console.warn('[Inventory] Warning persisting stock adjustment in DB:', err.message);
      }
    }

    if (this.io) {
      this.io.emit('inventory_updated', { itemId: item.id, newStock, isLowStock: newStock <= item.minThreshold });
    }

    return {
      success: true,
      itemId: item.id,
      itemName: item.name,
      previousStock,
      newStock,
      quantityDelta,
      isLowStock: newStock <= item.minThreshold,
      transaction: txRecord
    };
  }

  /**
   * Records material consumption on an emergency service request and updates invoice.
   */
  async recordJobMaterial({ requestId, itemId, quantity = 1, technicianId, idempotencyKey = null }) {
    if (!requestId || !itemId) {
      return { success: false, error: 'requestId and itemId are required.' };
    }
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be at least 1.' };
    }

    // Idempotency check
    const txKey = idempotencyKey || `mat_${requestId}_${itemId}_${quantity}`;
    if (this.processedTxKeys.has(txKey)) {
      return {
        success: true,
        message: 'Material usage already recorded.',
        idempotent: true
      };
    }

    // Retrieve service request
    let request = this.dispatchEngine?.state.requests.find((r) => r.id === requestId);
    if (!request && this.prisma) {
      request = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
        include: { invoice: true }
      });
    }

    if (!request) {
      return { success: false, error: `Service request ${requestId} not found.` };
    }

    if (['completed', 'cancelled'].includes(request.status)) {
      return { success: false, error: `Cannot record materials on finalized request (${request.status}).` };
    }

    if (request.assignedTechnicianId && technicianId && request.assignedTechnicianId !== technicianId) {
      return { success: false, error: 'Forbidden: Specialist is not assigned to this job.' };
    }

    // Deduct inventory stock
    const adjustResult = await this.adjustStock({
      itemId,
      quantityDelta: -quantity,
      transactionType: 'USAGE',
      reason: `Installed on Emergency Service Request ${requestId}`,
      technicianId: technicianId || request.assignedTechnicianId,
      requestId,
      idempotencyKey: txKey
    });

    if (!adjustResult.success) {
      return adjustResult;
    }

    // Retrieve item details for pricing
    let item = this.inMemoryItems.get(itemId);
    if (!item && this.prisma) {
      item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    }

    const unitPrice = item?.unitPrice || 0;
    const totalPrice = parseFloat((unitPrice * quantity).toFixed(2));

    const jobMaterialId = `jm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const jobMaterialRecord = {
      id: jobMaterialId,
      requestId,
      itemId,
      itemName: item?.name || 'Emergency Replacement Part',
      quantity,
      unitPrice,
      totalPrice,
      technicianId: technicianId || request.assignedTechnicianId,
      createdAt: new Date().toISOString()
    };

    this.inMemoryJobMaterials.push(jobMaterialRecord);

    // Update in-memory request parts list
    if (!request.materialsUsedList) request.materialsUsedList = [];
    request.materialsUsedList.push(jobMaterialRecord);
    request.partsUsed = request.materialsUsedList.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');

    // Synchronize Invoice with itemized material fee
    if (!request.invoice) {
      request.invoice = {
        inspectionFee: 49.0,
        emergencyLabor: 75.0,
        prioritySurcharge: request.priority === 'CRITICAL' ? 25.0 : 15.0,
        materialsFee: 0,
        totalAmount: 149.0,
        isPaid: false
      };
    }

    request.invoice.materialsFee = parseFloat(((request.invoice.materialsFee || 0) + totalPrice).toFixed(2));
    request.invoice.totalAmount = parseFloat(
      (
        (request.invoice.inspectionFee || 49.0) +
        (request.invoice.emergencyLabor || 75.0) +
        (request.invoice.prioritySurcharge || 25.0) +
        request.invoice.materialsFee
      ).toFixed(2)
    );

    // Persist JobMaterial and Invoice update to Supabase PostgreSQL
    if (this.prisma) {
      try {
        await this.prisma.jobMaterial.create({
          data: {
            id: jobMaterialId,
            requestId,
            itemId,
            itemName: jobMaterialRecord.itemName,
            quantity,
            unitPrice,
            totalPrice,
            technicianId: jobMaterialRecord.technicianId
          }
        });
        await this.prisma.invoice.updateMany({
          where: { requestId },
          data: {
            totalAmount: request.invoice.totalAmount
          }
        });
        await this.prisma.serviceRequest.update({
          where: { id: requestId },
          data: {
            partsUsed: request.partsUsed
          }
        });
      } catch (err) {
        console.warn('[Inventory] Warning persisting JobMaterial in DB:', err.message);
      }
    }

    this.processedTxKeys.add(txKey);

    if (this.io) {
      this.io.emit('request_updated', request);
    }

    return {
      success: true,
      material: jobMaterialRecord,
      invoice: request.invoice,
      message: `Recorded ${quantity}x ${jobMaterialRecord.itemName} (₹${totalPrice}) on invoice for ${requestId}.`
    };
  }

  /**
   * Retrieves materials recorded for a specific request.
   */
  async getJobMaterials(requestId) {
    if (!requestId) return [];

    if (this.prisma) {
      try {
        const materials = await this.prisma.jobMaterial.findMany({
          where: { requestId },
          orderBy: { createdAt: 'asc' }
        });
        if (materials.length > 0) return materials;
      } catch (err) {
        console.warn('[Inventory] Warning querying JobMaterials from DB:', err.message);
      }
    }

    return this.inMemoryJobMaterials.filter((m) => m.requestId === requestId);
  }
}

export const inventoryService = new InventoryService();
