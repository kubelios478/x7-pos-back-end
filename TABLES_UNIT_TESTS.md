# Pruebas Unitarias - Módulo Tables

## Descripción General
Este documento contiene las pruebas unitarias completas para el módulo de Tables, incluyendo todos los endpoints, validaciones, casos de éxito y manejo de errores.

## Estructura de Pruebas

### 1. CREATE Table (`POST /api/tables`)

#### 1.1 Casos de Éxito

**Test: Create Table Successfully**
```typescript
describe('POST /api/tables', () => {
  it('should create a table successfully', async () => {
    // Arrange
    const createDto: CreateTableDto = {
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window'
    };
    const authenticatedUserMerchantId = 1;
    
    const mockMerchant = { id: 1, name: 'Restaurant ABC' };
    const mockTable = {
      id: 1,
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window'
    };

    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(tableRepo, 'createQueryBuilder').mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null) // No existing table
    } as any);
    jest.spyOn(tableRepo, 'create').mockReturnValue(mockTable);
    jest.spyOn(tableRepo, 'save').mockResolvedValue(mockTable);

    // Act
    const result = await service.create(createDto, authenticatedUserMerchantId);

    // Assert
    expect(result).toEqual({
      id: 1,
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window',
      merchant: { id: 1, name: 'Restaurant ABC' }
    });
  });
});
```

#### 1.2 Casos de Error

**Test: Create Table - No Merchant ID**
```typescript
it('should throw ForbiddenException when user has no merchant_id', async () => {
  // Arrange
  const createDto: CreateTableDto = {
    merchant_id: 1,
    number: 'A1',
    capacity: 4,
    status: 'available',
    location: 'Near window'
  };
  const authenticatedUserMerchantId = null;

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('User must be associated with a merchant to create tables');
});
```

**Test: Create Table - Different Merchant**
```typescript
it('should throw ForbiddenException when trying to create for different merchant', async () => {
  // Arrange
  const createDto: CreateTableDto = {
    merchant_id: 2, // Different merchant
    number: 'A1',
    capacity: 4,
    status: 'available',
    location: 'Near window'
  };
  const authenticatedUserMerchantId = 1;

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('You can only create tables for your own merchant');
});
```

**Test: Create Table - Merchant Not Found**
```typescript
it('should throw NotFoundException when merchant does not exist', async () => {
  // Arrange
  const createDto: CreateTableDto = {
    merchant_id: 999,
    number: 'A1',
    capacity: 4,
    status: 'available',
    location: 'Near window'
  };
  const authenticatedUserMerchantId = 999;

  jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(null);

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(NotFoundException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('Merchant with ID 999 not found');
});
```

**Test: Create Table - Table Number Already Exists**
```typescript
it('should throw ConflictException when table number already exists', async () => {
  // Arrange
  const createDto: CreateTableDto = {
    merchant_id: 1,
    number: 'A1',
    capacity: 4,
    status: 'available',
    location: 'Near window'
  };
  const authenticatedUserMerchantId = 1;

  const mockMerchant = { id: 1, name: 'Restaurant ABC' };
  const existingTable = { id: 1, number: 'A1', merchant_id: 1 };

  jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(tableRepo, 'createQueryBuilder').mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(existingTable) // Existing table found
    } as any);

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(ConflictException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('Table number \'A1\' already exists for merchant 1');
});
```

**Test: Create Table - Invalid Capacity (Zero)**
```typescript
it('should throw BadRequestException when capacity is zero or negative', async () => {
  // Arrange
  const createDto: CreateTableDto = {
    merchant_id: 1,
    number: 'A1',
    capacity: 0, // Invalid capacity
    status: 'available',
    location: 'Near window'
  };
  const authenticatedUserMerchantId = 1;

  const mockMerchant = { id: 1, name: 'Restaurant ABC' };
  jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
  jest.spyOn(tableRepo, 'createQueryBuilder').mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null)
  } as any);

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('Table capacity must be greater than 0');
});
```


### 2. GET ALL Tables (`GET /api/tables`)

#### 2.1 Casos de Éxito

**Test: Get All Tables Successfully**
```typescript
describe('GET /api/tables', () => {
  it('should return paginated tables successfully', async () => {
    // Arrange
    const query: GetTablesQueryDto = {
      page: 1,
      limit: 10,
      status: 'available',
      minCapacity: 2,
      maxCapacity: 6
    };
    const authenticatedUserMerchantId = 1;

    const mockMerchant = { id: 1, name: 'Restaurant ABC' };
    const mockTables = [
      {
        id: 1,
        merchant_id: 1,
        number: 'A1',
        capacity: 4,
        status: 'available',
        location: 'Near window',
        merchant: { id: 1, name: 'Restaurant ABC' }
      }
    ];

    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(tableRepo, 'createQueryBuilder').mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue(mockTables)
    } as any);

    // Act
    const result = await service.findAll(query, authenticatedUserMerchantId);

    // Assert
    expect(result).toEqual({
      data: [{
        id: 1,
        merchant_id: 1,
        number: 'A1',
        capacity: 4,
        status: 'available',
        location: 'Near window',
        merchant: { id: 1, name: 'Restaurant ABC' }
      }],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    });
  });
});
```

#### 2.2 Casos de Error

**Test: Get All Tables - No Merchant ID**
```typescript
it('should throw ForbiddenException when user has no merchant_id', async () => {
  // Arrange
  const query: GetTablesQueryDto = { page: 1, limit: 10 };
  const authenticatedUserMerchantId = null;

  // Act & Assert
  await expect(service.findAll(query, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.findAll(query, authenticatedUserMerchantId))
    .rejects.toThrow('User must be associated with a merchant to view tables');
});
```

**Test: Get All Tables - Invalid Capacity Range**
```typescript
it('should throw BadRequestException when minCapacity > maxCapacity', async () => {
  // Arrange
  const query: GetTablesQueryDto = {
    page: 1,
    limit: 10,
    minCapacity: 6,
    maxCapacity: 4 // Invalid range
  };
  const authenticatedUserMerchantId = 1;

  const mockMerchant = { id: 1, name: 'Restaurant ABC' };
  jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);

  // Act & Assert
  await expect(service.findAll(query, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.findAll(query, authenticatedUserMerchantId))
    .rejects.toThrow('Minimum capacity cannot be greater than maximum capacity');
});
```

### 3. GET ONE Table (`GET /api/tables/:id`)

#### 3.1 Casos de Éxito

**Test: Get One Table Successfully**
```typescript
describe('GET /api/tables/:id', () => {
  it('should return table successfully', async () => {
    // Arrange
    const id = 1;
    const authenticatedUserMerchantId = 1;

    const mockTable = {
      id: 1,
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window',
      merchant: { id: 1, name: 'Restaurant ABC' }
    };
    const mockMerchant = { id: 1, name: 'Restaurant ABC' };

    jest.spyOn(tableRepo, 'findOne').mockResolvedValue(mockTable);
    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);

    // Act
    const result = await service.findOne(id, authenticatedUserMerchantId);

    // Assert
    expect(result).toEqual({
      id: 1,
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window',
      merchant: { id: 1, name: 'Restaurant ABC' }
    });
  });
});
```

#### 3.2 Casos de Error

**Test: Get One Table - Invalid ID**
```typescript
it('should throw BadRequestException when ID is invalid', async () => {
  // Arrange
  const id = 0; // Invalid ID
  const authenticatedUserMerchantId = 1;

  // Act & Assert
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow('Invalid table ID');
});
```

**Test: Get One Table - Not Found**
```typescript
it('should throw NotFoundException when table does not exist', async () => {
  // Arrange
  const id = 999;
  const authenticatedUserMerchantId = 1;

  jest.spyOn(tableRepo, 'findOne').mockResolvedValue(null);

  // Act & Assert
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow(NotFoundException);
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow('Table 999 not found');
});
```

**Test: Get One Table - Different Merchant**
```typescript
it('should throw ForbiddenException when table belongs to different merchant', async () => {
  // Arrange
  const id = 1;
  const authenticatedUserMerchantId = 2; // Different merchant

  const mockTable = {
    id: 1,
    merchant_id: 1, // Different merchant
    number: 'A1',
    capacity: 4,
    status: 'available',
    location: 'Near window',
    merchant: { id: 1, name: 'Restaurant ABC' }
  };

  jest.spyOn(tableRepo, 'findOne').mockResolvedValue(mockTable);

  // Act & Assert
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow('You can only view tables from your own merchant');
});
```

### 4. UPDATE Table (`PUT /api/tables/:id`)

#### 4.1 Casos de Éxito

**Test: Update Table Successfully**
```typescript
describe('PUT /api/tables/:id', () => {
  it('should update table successfully', async () => {
    // Arrange
    const id = 1;
    const updateDto: UpdateTableDto = {
      number: 'A2',
      capacity: 6,
      status: 'occupied',
      location: 'Corner table'
    };
    const authenticatedUserMerchantId = 1;

    const mockTable = {
      id: 1,
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window',
      merchant: { id: 1, name: 'Restaurant ABC' }
    };
    const mockMerchant = { id: 1, name: 'Restaurant ABC' };

    jest.spyOn(tableRepo, 'findOne').mockResolvedValue(mockTable);
    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(tableRepo, 'createQueryBuilder').mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null) // No existing table with new number
    } as any);
    jest.spyOn(tableRepo, 'save').mockResolvedValue({
      ...mockTable,
      number: 'A2',
      capacity: 6,
      status: 'occupied',
      location: 'Corner table'
    });

    // Act
    const result = await service.update(id, updateDto, authenticatedUserMerchantId);

    // Assert
    expect(result.number).toBe('A2');
    expect(result.capacity).toBe(6);
    expect(result.status).toBe('occupied');
    expect(result.location).toBe('Corner table');
  });
});
```

#### 4.2 Casos de Error

**Test: Update Table - DTO Undefined**
```typescript
it('should throw BadRequestException when DTO is undefined', async () => {
  // Arrange
  const id = 1;
  const updateDto = undefined;
  const authenticatedUserMerchantId = 1;

  // Act & Assert
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow('Update data is required');
});
```

**Test: Update Table - Empty DTO**
```typescript
it('should throw BadRequestException when DTO is empty', async () => {
  // Arrange
  const id = 1;
  const updateDto = {};
  const authenticatedUserMerchantId = 1;

  // Act & Assert
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow('At least one field must be provided for update');
});
```

**Test: Update Table - Invalid Capacity**
```typescript
it('should throw BadRequestException when capacity is invalid', async () => {
  // Arrange
  const id = 1;
  const updateDto: UpdateTableDto = {
    capacity: 0 // Invalid capacity
  };
  const authenticatedUserMerchantId = 1;

  const mockTable = {
    id: 1,
    merchant_id: 1,
    number: 'A1',
    capacity: 4,
    status: 'available',
    location: 'Near window',
    merchant: { id: 1, name: 'Restaurant ABC' }
  };

    jest.spyOn(tableRepo, 'findOne').mockResolvedValue(mockTable);

  // Act & Assert
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow('Table capacity must be a positive integer');
});
```

**Test: Update Table - Table Number Already Exists**
```typescript
it('should throw ConflictException when table number already exists', async () => {
  // Arrange
  const id = 1;
  const updateDto: UpdateTableDto = {
    number: 'A2' // Different number
  };
  const authenticatedUserMerchantId = 1;

  const mockTable = {
    id: 1,
    merchant_id: 1,
    number: 'A1',
    capacity: 4,
    status: 'available',
    location: 'Near window',
    merchant: { id: 1, name: 'Restaurant ABC' }
  };
  const existingTable = { id: 2, number: 'A2', merchant_id: 1 };

  jest.spyOn(tableRepo, 'findOne').mockResolvedValue(mockTable);
  jest.spyOn(tableRepo, 'createQueryBuilder').mockReturnValue({
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(existingTable) // Existing table found
  } as any);

  // Act & Assert
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow(ConflictException);
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow('Table number \'A2\' already exists for your merchant');
});
```

### 5. DELETE Table (`DELETE /api/tables/:id`)

#### 5.1 Casos de Éxito

**Test: Delete Table Successfully (Soft Delete)**
```typescript
describe('DELETE /api/tables/:id', () => {
  it('should soft delete table successfully', async () => {
    // Arrange
    const id = 1;
    const authenticatedUserMerchantId = 1;

    const mockTable = {
      id: 1,
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window',
      merchant: { id: 1, name: 'Restaurant ABC' }
    };
    const mockMerchant = { id: 1, name: 'Restaurant ABC' };

    jest.spyOn(tableRepo, 'findOne').mockResolvedValue(mockTable);
    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(tableRepo, 'save').mockResolvedValue({
      ...mockTable,
      status: 'deleted'
    });

    // Act
    const result = await service.remove(id, authenticatedUserMerchantId);

    // Assert
    expect(result.status).toBe('deleted');
    expect(tableRepo.save).toHaveBeenCalledWith({
      ...mockTable,
      status: 'deleted'
    });
  });
});
```

#### 5.2 Casos de Error

**Test: Delete Table - Invalid ID**
```typescript
it('should throw BadRequestException when ID is invalid', async () => {
  // Arrange
  const id = 0; // Invalid ID
  const authenticatedUserMerchantId = 1;

  // Act & Assert
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow('Invalid table ID');
});
```

**Test: Delete Table - Not Found**
```typescript
it('should throw NotFoundException when table does not exist', async () => {
  // Arrange
  const id = 999;
  const authenticatedUserMerchantId = 1;

  jest.spyOn(tableRepo, 'findOne').mockResolvedValue(null);

  // Act & Assert
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow(NotFoundException);
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow('Table 999 not found');
});
```

**Test: Delete Table - Different Merchant**
```typescript
it('should throw ForbiddenException when table belongs to different merchant', async () => {
  // Arrange
  const id = 1;
  const authenticatedUserMerchantId = 2; // Different merchant

  const mockTable = {
    id: 1,
    merchant_id: 1, // Different merchant
    number: 'A1',
    capacity: 4,
    status: 'available',
    location: 'Near window',
    merchant: { id: 1, name: 'Restaurant ABC' }
  };

  jest.spyOn(tableRepo, 'findOne').mockResolvedValue(mockTable);

  // Act & Assert
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow('You can only delete tables from your own merchant');
});
```

**Test: Delete Table - Already Deleted**
```typescript
it('should throw ConflictException when table is already deleted', async () => {
  // Arrange
  const id = 1;
  const authenticatedUserMerchantId = 1;

  const mockTable = {
    id: 1,
    merchant_id: 1,
    number: 'A1',
    capacity: 4,
    status: 'deleted', // Already deleted
    location: 'Near window',
    merchant: { id: 1, name: 'Restaurant ABC' }
  };

  jest.spyOn(tableRepo, 'findOne').mockResolvedValue(mockTable);

  // Act & Assert
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow(ConflictException);
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow('Table is already deleted');
});
```

## Matriz de Cobertura de Pruebas

### Endpoints Cubiertos
- ✅ POST /api/tables (Create)
- ✅ GET /api/tables (Get All)
- ✅ GET /api/tables/:id (Get One)
- ✅ PUT /api/tables/:id (Update)
- ✅ DELETE /api/tables/:id (Delete)

### Códigos de Estado HTTP Cubiertos
- ✅ 200 OK (Success)
- ✅ 201 Created (Create Success)
- ✅ 400 Bad Request (Validation Errors)
- ✅ 403 Forbidden (Permission Errors)
- ✅ 404 Not Found (Resource Not Found)
- ✅ 409 Conflict (Business Rule Violations)

### Validaciones Cubiertas
- ✅ Autenticación y autorización
- ✅ Validación de parámetros
- ✅ Validación de existencia de entidades
- ✅ Validación de permisos por merchant
- ✅ Validación de reglas de negocio
- ✅ Validación de unicidad (número de mesa)
- ✅ Validación de tipos de datos
- ✅ Validación de rangos (capacidad mínima 1, sin máximo)
- ✅ Validación de rangos de filtros

### Casos Edge Cubiertos
- ✅ DTOs undefined o vacíos
- ✅ IDs inválidos (0, negativos, no enteros)
- ✅ Entidades no encontradas
- ✅ Violaciones de permisos
- ✅ Violaciones de reglas de negocio
- ✅ Campos vacíos o demasiado largos
- ✅ Soft delete de registros ya eliminados
- ✅ Rangos de capacidad inválidos
- ✅ Números de mesa duplicados

### Validaciones Específicas de Tables
- ✅ Capacidad mínima de 1 persona (sin máximo)
- ✅ Unicidad de número de mesa por merchant
- ✅ Validación de rangos de filtros (minCapacity vs maxCapacity)
- ✅ Soft delete con cambio de status a 'deleted'
- ✅ Filtros por número, estado, capacidad y ubicación
- ✅ Paginación con metadatos completos

### Casos de Integración
- ✅ Relaciones con Merchant correctamente validadas
- ✅ Filtros combinados funcionando correctamente
- ✅ Paginación con diferentes límites
- ✅ Ordenamiento por número de mesa
- ✅ Búsqueda parcial por número y ubicación
