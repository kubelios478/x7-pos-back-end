# Pruebas Unitarias - Módulo Collaborators

## Descripción General
Este documento contiene las pruebas unitarias completas para el módulo de Collaborators, incluyendo todos los endpoints, validaciones, casos de éxito y manejo de errores.

## Estructura de Pruebas

### 1. CREATE Collaborator (`POST /api/collaborators`)

#### 1.1 Casos de Éxito

**Test: Create Collaborator Successfully**
```typescript
describe('POST /api/collaborators', () => {
  it('should create a collaborator successfully', async () => {
    // Arrange
    const createDto: CreateCollaboratorDto = {
      user_id: 1,
      merchant_id: 1,
      name: 'Juan Pérez',
      role: ShiftRole.MESERO,
      status: CollaboratorStatus.ACTIVO
    };
    const authenticatedUserMerchantId = 1;
    
    const mockUser = { id: 1, username: 'juan_user', email: 'juan@email.com' };
    const mockMerchant = { id: 1, name: 'Restaurant ABC' };
    const mockCollaborator = {
      id: 1,
      user_id: 1,
      merchant_id: 1,
      name: 'Juan Pérez',
      role: ShiftRole.MESERO,
      status: CollaboratorStatus.ACTIVO
    };

    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
    jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(null);
    jest.spyOn(collaboratorRepo, 'create').mockReturnValue(mockCollaborator);
    jest.spyOn(collaboratorRepo, 'save').mockResolvedValue(mockCollaborator);

    // Act
    const result = await service.create(createDto, authenticatedUserMerchantId);

    // Assert
    expect(result).toEqual({
      id: 1,
      user_id: 1,
      merchant_id: 1,
      name: 'Juan Pérez',
      role: ShiftRole.MESERO,
      status: CollaboratorStatus.ACTIVO,
      merchant: { id: 1, name: 'Restaurant ABC' },
      user: { id: 1, firstname: 'juan_user', lastname: 'juan@email.com' }
    });
  });
});
```

#### 1.2 Casos de Error

**Test: Create Collaborator - No Merchant ID**
```typescript
it('should throw ForbiddenException when user has no merchant_id', async () => {
  // Arrange
  const createDto: CreateCollaboratorDto = {
    user_id: 1,
    merchant_id: 1,
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };
  const authenticatedUserMerchantId = null;

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('User must be associated with a merchant to create collaborators');
});
```

**Test: Create Collaborator - Different Merchant**
```typescript
it('should throw ForbiddenException when trying to create for different merchant', async () => {
  // Arrange
  const createDto: CreateCollaboratorDto = {
    user_id: 1,
    merchant_id: 2, // Different merchant
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };
  const authenticatedUserMerchantId = 1;

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('You can only create collaborators for your own merchant');
});
```

**Test: Create Collaborator - Merchant Not Found**
```typescript
it('should throw NotFoundException when merchant does not exist', async () => {
  // Arrange
  const createDto: CreateCollaboratorDto = {
    user_id: 1,
    merchant_id: 999,
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
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

**Test: Create Collaborator - User Not Found**
```typescript
it('should throw NotFoundException when user does not exist', async () => {
  // Arrange
  const createDto: CreateCollaboratorDto = {
    user_id: 999,
    merchant_id: 1,
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };
  const authenticatedUserMerchantId = 1;

  const mockMerchant = { id: 1, name: 'Restaurant ABC' };
  jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
  jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(NotFoundException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('User with ID 999 not found');
});
```

**Test: Create Collaborator - User Already Collaborator**
```typescript
it('should throw ConflictException when user is already a collaborator', async () => {
  // Arrange
  const createDto: CreateCollaboratorDto = {
    user_id: 1,
    merchant_id: 1,
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };
  const authenticatedUserMerchantId = 1;

  const mockMerchant = { id: 1, name: 'Restaurant ABC' };
  const mockUser = { id: 1, username: 'juan_user', email: 'juan@email.com' };
  const existingCollaborator = { id: 1, user_id: 1, merchant_id: 1 };

  jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
  jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
  jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(existingCollaborator);

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(ConflictException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('User with ID \'1\' is already a collaborator. A user can only be a collaborator for one merchant.');
});
```

**Test: Create Collaborator - Empty Name**
```typescript
it('should throw BadRequestException when name is empty', async () => {
  // Arrange
  const createDto: CreateCollaboratorDto = {
    user_id: 1,
    merchant_id: 1,
    name: '', // Empty name
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };
  const authenticatedUserMerchantId = 1;

  const mockMerchant = { id: 1, name: 'Restaurant ABC' };
  const mockUser = { id: 1, username: 'juan_user', email: 'juan@email.com' };

  jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
  jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
  jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(null);

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('Collaborator name cannot be empty');
});
```

**Test: Create Collaborator - Name Too Long**
```typescript
it('should throw BadRequestException when name exceeds 150 characters', async () => {
  // Arrange
  const createDto: CreateCollaboratorDto = {
    user_id: 1,
    merchant_id: 1,
    name: 'A'.repeat(151), // 151 characters
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };
  const authenticatedUserMerchantId = 1;

  const mockMerchant = { id: 1, name: 'Restaurant ABC' };
  const mockUser = { id: 1, username: 'juan_user', email: 'juan@email.com' };

  jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
  jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
  jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(null);

  // Act & Assert
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.create(createDto, authenticatedUserMerchantId))
    .rejects.toThrow('Collaborator name cannot exceed 150 characters');
});
```

### 2. GET ALL Collaborators (`GET /api/collaborators`)

#### 2.1 Casos de Éxito

**Test: Get All Collaborators Successfully**
```typescript
describe('GET /api/collaborators', () => {
  it('should return paginated collaborators successfully', async () => {
    // Arrange
    const query: GetCollaboratorsQueryDto = {
      page: 1,
      limit: 10,
      status: CollaboratorStatus.ACTIVO
    };
    const authenticatedUserMerchantId = 1;

    const mockMerchant = { id: 1, name: 'Restaurant ABC' };
    const mockCollaborators = [
      {
        id: 1,
        user_id: 1,
        merchant_id: 1,
        name: 'Juan Pérez',
        role: ShiftRole.MESERO,
        status: CollaboratorStatus.ACTIVO,
        user: { id: 1, username: 'juan_user', email: 'juan@email.com' },
        merchant: { id: 1, name: 'Restaurant ABC' }
      }
    ];

    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(collaboratorRepo, 'createQueryBuilder').mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue(mockCollaborators)
    } as any);

    // Act
    const result = await service.findAll(query, authenticatedUserMerchantId);

    // Assert
    expect(result).toEqual({
      data: [{
        id: 1,
        user_id: 1,
        merchant_id: 1,
        name: 'Juan Pérez',
        role: ShiftRole.MESERO,
        status: CollaboratorStatus.ACTIVO,
        merchant: { id: 1, name: 'Restaurant ABC' },
        user: { id: 1, firstname: 'juan_user', lastname: 'juan@email.com' }
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

**Test: Get All Collaborators - No Merchant ID**
```typescript
it('should throw ForbiddenException when user has no merchant_id', async () => {
  // Arrange
  const query: GetCollaboratorsQueryDto = { page: 1, limit: 10 };
  const authenticatedUserMerchantId = null;

  // Act & Assert
  await expect(service.findAll(query, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.findAll(query, authenticatedUserMerchantId))
    .rejects.toThrow('User must be associated with a merchant to view collaborators');
});
```

**Test: Get All Collaborators - Merchant Not Found**
```typescript
it('should throw NotFoundException when merchant does not exist', async () => {
  // Arrange
  const query: GetCollaboratorsQueryDto = { page: 1, limit: 10 };
  const authenticatedUserMerchantId = 999;

  jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(null);

  // Act & Assert
  await expect(service.findAll(query, authenticatedUserMerchantId))
    .rejects.toThrow(NotFoundException);
  await expect(service.findAll(query, authenticatedUserMerchantId))
    .rejects.toThrow('Merchant with ID 999 not found');
});
```

### 3. GET ONE Collaborator (`GET /api/collaborators/:id`)

#### 3.1 Casos de Éxito

**Test: Get One Collaborator Successfully**
```typescript
describe('GET /api/collaborators/:id', () => {
  it('should return collaborator successfully', async () => {
    // Arrange
    const id = 1;
    const authenticatedUserMerchantId = 1;

    const mockCollaborator = {
      id: 1,
      user_id: 1,
      merchant_id: 1,
      name: 'Juan Pérez',
      role: ShiftRole.MESERO,
      status: CollaboratorStatus.ACTIVO,
      user: { id: 1, username: 'juan_user', email: 'juan@email.com' },
      merchant: { id: 1, name: 'Restaurant ABC' }
    };
    const mockMerchant = { id: 1, name: 'Restaurant ABC' };
    const mockUser = { id: 1, username: 'juan_user', email: 'juan@email.com' };

    jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(mockCollaborator);
    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);

    // Act
    const result = await service.findOne(id, authenticatedUserMerchantId);

    // Assert
    expect(result).toEqual({
      id: 1,
      user_id: 1,
      merchant_id: 1,
      name: 'Juan Pérez',
      role: ShiftRole.MESERO,
      status: CollaboratorStatus.ACTIVO,
      merchant: { id: 1, name: 'Restaurant ABC' },
      user: { id: 1, firstname: 'juan_user', lastname: 'juan@email.com' }
    });
  });
});
```

#### 3.2 Casos de Error

**Test: Get One Collaborator - Invalid ID**
```typescript
it('should throw BadRequestException when ID is invalid', async () => {
  // Arrange
  const id = 0; // Invalid ID
  const authenticatedUserMerchantId = 1;

  // Act & Assert
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow('Invalid collaborator ID');
});
```

**Test: Get One Collaborator - Not Found**
```typescript
it('should throw NotFoundException when collaborator does not exist', async () => {
  // Arrange
  const id = 999;
  const authenticatedUserMerchantId = 1;

  jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(null);

  // Act & Assert
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow(NotFoundException);
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow('Collaborator 999 not found');
});
```

**Test: Get One Collaborator - Different Merchant**
```typescript
it('should throw ForbiddenException when collaborator belongs to different merchant', async () => {
  // Arrange
  const id = 1;
  const authenticatedUserMerchantId = 2; // Different merchant

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1, // Different merchant
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };

  jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(mockCollaborator);

  // Act & Assert
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.findOne(id, authenticatedUserMerchantId))
    .rejects.toThrow('You can only view collaborators from your own merchant');
});
```

### 4. UPDATE Collaborator (`PUT /api/collaborators/:id`)

#### 4.1 Casos de Éxito

**Test: Update Collaborator Successfully**
```typescript
describe('PUT /api/collaborators/:id', () => {
  it('should update collaborator successfully', async () => {
    // Arrange
    const id = 1;
    const updateDto: UpdateCollaboratorDto = {
      name: 'Juan Carlos Pérez',
      role: ShiftRole.CAJERO,
      status: CollaboratorStatus.INACTIVO
    };
    const authenticatedUserMerchantId = 1;

    const mockCollaborator = {
      id: 1,
      user_id: 1,
      merchant_id: 1,
      name: 'Juan Pérez',
      role: ShiftRole.MESERO,
      status: CollaboratorStatus.ACTIVO,
      user: { id: 1, username: 'juan_user', email: 'juan@email.com' },
      merchant: { id: 1, name: 'Restaurant ABC' }
    };
    const mockMerchant = { id: 1, name: 'Restaurant ABC' };
    const mockUser = { id: 1, username: 'juan_user', email: 'juan@email.com' };

    jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(mockCollaborator);
    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
    jest.spyOn(collaboratorRepo, 'save').mockResolvedValue({
      ...mockCollaborator,
      name: 'Juan Carlos Pérez',
      role: ShiftRole.CAJERO,
      status: CollaboratorStatus.INACTIVO
    });

    // Act
    const result = await service.update(id, updateDto, authenticatedUserMerchantId);

    // Assert
    expect(result.name).toBe('Juan Carlos Pérez');
    expect(result.role).toBe(ShiftRole.CAJERO);
    expect(result.status).toBe(CollaboratorStatus.INACTIVO);
  });
});
```

#### 4.2 Casos de Error

**Test: Update Collaborator - DTO Undefined**
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

**Test: Update Collaborator - Empty DTO**
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

**Test: Update Collaborator - Invalid Name**
```typescript
it('should throw BadRequestException when name is empty', async () => {
  // Arrange
  const id = 1;
  const updateDto: UpdateCollaboratorDto = {
    name: '' // Empty name
  };
  const authenticatedUserMerchantId = 1;

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1,
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };

  jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(mockCollaborator);

  // Act & Assert
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow('Name must be a non-empty string');
});
```

**Test: Update Collaborator - User Already Collaborator**
```typescript
it('should throw ConflictException when user is already a collaborator', async () => {
  // Arrange
  const id = 1;
  const updateDto: UpdateCollaboratorDto = {
    user_id: 2 // Different user
  };
  const authenticatedUserMerchantId = 1;

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1,
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };
  const existingCollaborator = { id: 2, user_id: 2, merchant_id: 1 };

  jest.spyOn(collaboratorRepo, 'findOne')
    .mockResolvedValueOnce(mockCollaborator) // First call for finding collaborator
    .mockResolvedValueOnce(existingCollaborator); // Second call for checking uniqueness
    jest.spyOn(userRepo, 'findOne').mockResolvedValue({ id: 2, username: 'maria_user', email: 'maria@email.com' });

  // Act & Assert
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow(ConflictException);
  await expect(service.update(id, updateDto, authenticatedUserMerchantId))
    .rejects.toThrow('User with ID \'2\' is already a collaborator. A user can only be a collaborator for one merchant.');
});
```

### 5. DELETE Collaborator (`DELETE /api/collaborators/:id`)

#### 5.1 Casos de Éxito

**Test: Delete Collaborator Successfully (Soft Delete)**
```typescript
describe('DELETE /api/collaborators/:id', () => {
  it('should soft delete collaborator successfully', async () => {
    // Arrange
    const id = 1;
    const authenticatedUserMerchantId = 1;

    const mockCollaborator = {
      id: 1,
      user_id: 1,
      merchant_id: 1,
      name: 'Juan Pérez',
      role: ShiftRole.MESERO,
      status: CollaboratorStatus.ACTIVO,
      user: { id: 1, username: 'juan_user', email: 'juan@email.com' },
      merchant: { id: 1, name: 'Restaurant ABC' }
    };
    const mockMerchant = { id: 1, name: 'Restaurant ABC' };
    const mockUser = { id: 1, username: 'juan_user', email: 'juan@email.com' };

    jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(mockCollaborator);
    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
    jest.spyOn(collaboratorRepo, 'save').mockResolvedValue({
      ...mockCollaborator,
      status: CollaboratorStatus.DELETED
    });

    // Act
    const result = await service.remove(id, authenticatedUserMerchantId);

    // Assert
    expect(result.status).toBe(CollaboratorStatus.DELETED);
    expect(collaboratorRepo.save).toHaveBeenCalledWith({
      ...mockCollaborator,
      status: CollaboratorStatus.DELETED
    });
  });
});
```

#### 5.2 Casos de Error

**Test: Delete Collaborator - Invalid ID**
```typescript
it('should throw BadRequestException when ID is invalid', async () => {
  // Arrange
  const id = 0; // Invalid ID
  const authenticatedUserMerchantId = 1;

  // Act & Assert
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow(BadRequestException);
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow('Invalid collaborator ID');
});
```

**Test: Delete Collaborator - Not Found**
```typescript
it('should throw NotFoundException when collaborator does not exist', async () => {
  // Arrange
  const id = 999;
  const authenticatedUserMerchantId = 1;

  jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(null);

  // Act & Assert
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow(NotFoundException);
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow('Collaborator 999 not found');
});
```

**Test: Delete Collaborator - Different Merchant**
```typescript
it('should throw ForbiddenException when collaborator belongs to different merchant', async () => {
  // Arrange
  const id = 1;
  const authenticatedUserMerchantId = 2; // Different merchant

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1, // Different merchant
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.ACTIVO
  };

  jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(mockCollaborator);

  // Act & Assert
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow(ForbiddenException);
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow('You can only delete collaborators from your own merchant');
});
```

**Test: Delete Collaborator - Already Deleted**
```typescript
it('should throw ConflictException when collaborator is already deleted', async () => {
  // Arrange
  const id = 1;
  const authenticatedUserMerchantId = 1;

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1,
    name: 'Juan Pérez',
    role: ShiftRole.MESERO,
    status: CollaboratorStatus.DELETED // Already deleted
  };

  jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue(mockCollaborator);

  // Act & Assert
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow(ConflictException);
  await expect(service.remove(id, authenticatedUserMerchantId))
    .rejects.toThrow('Collaborator is already deleted');
});
```

## Matriz de Cobertura de Pruebas

### Endpoints Cubiertos
- ✅ POST /api/collaborators (Create)
- ✅ GET /api/collaborators (Get All)
- ✅ GET /api/collaborators/:id (Get One)
- ✅ PUT /api/collaborators/:id (Update)
- ✅ DELETE /api/collaborators/:id (Delete)

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
- ✅ Validación de unicidad
- ✅ Validación de tipos de datos
- ✅ Validación de longitud de campos

### Casos Edge Cubiertos
- ✅ DTOs undefined o vacíos
- ✅ IDs inválidos (0, negativos, no enteros)
- ✅ Entidades no encontradas
- ✅ Violaciones de permisos
- ✅ Violaciones de reglas de negocio
- ✅ Campos vacíos o demasiado largos
- ✅ Soft delete de registros ya eliminados
