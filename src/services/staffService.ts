/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Staff & Employees Management Service (Backend Controller Logic)
 */

import { StaffMember, StaffPermissions, StaffRoleType } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../data/initialData';
import { AppStorage } from './storage';

export class StaffService {
  /**
   * Get all staff members from storage
   */
  static getAll(): StaffMember[] {
    return AppStorage.getStaff();
  }

  /**
   * Get single staff member by ID
   */
  static getById(id: string): StaffMember | undefined {
    const list = this.getAll();
    return list.find((s) => s.id === id);
  }

  /**
   * Find staff member by username
   */
  static getByUsername(username: string): StaffMember | undefined {
    const list = this.getAll();
    const clean = username.trim().toLowerCase();
    return list.find((s) => s.username.toLowerCase() === clean);
  }

  /**
   * Authenticate staff credentials
   */
  static authenticate(username: string, password: string): StaffMember | null {
    const cleanUser = username.trim().toLowerCase();
    const list = this.getAll();
    const staff = list.find(
      (s) => s.username.toLowerCase() === cleanUser && s.password === password
    );

    if (staff && staff.status === 'active') {
      // Update last login
      const updated = list.map((s) =>
        s.id === staff.id ? { ...s, lastLogin: new Date().toISOString() } : s
      );
      AppStorage.saveStaff(updated);
      AppStorage.saveCurrentStaff(staff);
      return staff;
    }
    return null;
  }

  /**
   * Create new staff member
   */
  static create(data: Omit<StaffMember, 'id' | 'createdAt'>): StaffMember {
    const list = this.getAll();
    const newStaff: StaffMember = {
      ...data,
      id: `staff-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };

    const updated = [newStaff, ...list];
    AppStorage.saveStaff(updated);
    return newStaff;
  }

  /**
   * Update existing staff member
   */
  static update(id: string, updates: Partial<StaffMember>): StaffMember | null {
    const list = this.getAll();
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updatedStaff: StaffMember = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedStaff;
    AppStorage.saveStaff([...list]);

    // If updating current active staff, also update currentStaff in storage
    const current = AppStorage.getCurrentStaff();
    if (current && current.id === id) {
      AppStorage.saveCurrentStaff(updatedStaff);
    }

    return updatedStaff;
  }

  /**
   * Delete staff member
   */
  static delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;

    AppStorage.saveStaff(filtered);
    return true;
  }

  /**
   * Toggle active/inactive status
   */
  static toggleStatus(id: string): StaffMember | null {
    const staff = this.getById(id);
    if (!staff) return null;
    return this.update(id, {
      status: staff.status === 'active' ? 'inactive' : 'active'
    });
  }

  /**
   * Generate default permissions for a given role
   */
  static getDefaultPermissions(role: StaffRoleType): StaffPermissions {
    return { ...DEFAULT_ROLE_PERMISSIONS[role] };
  }

  /**
   * Generate random secure temporary password
   */
  static generatePassword(role: StaffRoleType): string {
    const prefix =
      role === 'admin'
        ? 'Admin'
        : role === 'seller'
        ? 'Sotuvchi'
        : role === 'master'
        ? 'Usta'
        : role === 'assembler'
        ? 'Yiguvchi'
        : role === 'warehouse'
        ? 'Ombor'
        : 'Shohrent';
    const randNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randNum}`;
  }

  /**
   * Role label in Uzbek
   */
  static getRoleLabel(role: StaffRoleType, customRoleName?: string): string {
    if (role === 'custom' && customRoleName) {
      return customRoleName;
    }
    switch (role) {
      case 'admin':
        return 'Boshqaruvchi / Admin';
      case 'seller':
        return 'Sotuvchi / Menejer';
      case 'master':
        return 'Usta / Texnik ta‘mirchi';
      case 'assembler':
        return 'Yig‘uvchi / Komplektovshik';
      case 'warehouse':
        return 'Omborchi / Zavsklad';
      case 'driver':
        return 'Haydovchi / Yetkazuvchi';
      case 'accountant':
        return 'Buxgalter / Kassir';
      case 'custom':
        return customRoleName || 'Maxsus lavozim';
      default:
        return role;
    }
  }

  /**
   * Check if user has permission
   */
  static hasPermission(
    staff: StaffMember | null,
    permissionKey: keyof StaffPermissions
  ): boolean {
    if (!staff) return true; // fallback to admin if no staff bound
    if (staff.role === 'admin') return true;
    return !!staff.permissions[permissionKey];
  }
}
