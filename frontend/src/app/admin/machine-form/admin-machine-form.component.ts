import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiFailure } from '../../core/models/api.model';
import { CategoryService } from '../../core/services/category.service';
import { I18nService } from '../../core/services/i18n.service';
import {
  MACHINE_STATUSES,
  Machine,
  MachineDocument,
  MachineImage,
  MachinePayload,
} from '../../core/models/machine.model';
import { MachineService } from '../../core/services/machine.service';
import { ToastService } from '../../core/services/toast.service';
import { MachineImageComponent } from '../../shared/components/machine-image/machine-image.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

/**
 * Create / edit a machine.
 *
 * Structured so the company can publish a machine without touching code:
 * every visitor-facing string is here in both languages, specifications are a
 * repeatable list, and photographs upload straight from this form.
 *
 * Media is only available once the machine exists — an image needs a machine id
 * to attach to — so a new machine is saved first and the form then switches
 * into edit mode in place, without a navigation.
 */
@Component({
  selector: 'app-admin-machine-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MachineImageComponent, ConfirmDialogComponent],
  templateUrl: './admin-machine-form.component.html',
  styleUrl: './admin-machine-form.component.scss',
})
export class AdminMachineFormComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly categories = inject(CategoryService);
  private readonly machines = inject(MachineService);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly statuses = MACHINE_STATUSES;

  protected readonly machineId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadingDocs = signal(false);

  protected readonly images = signal<MachineImage[]>([]);
  protected readonly documents = signal<MachineDocument[]>([]);
  protected readonly pendingImageDelete = signal<MachineImage | null>(null);

  protected readonly isEdit = computed(() => this.machineId() !== null);

  protected readonly form: FormGroup = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(160)]],
    nameAr: ['', [Validators.required, Validators.maxLength(160)]],
    slug: [''],
    shortDescriptionEn: [''],
    shortDescriptionAr: [''],
    descriptionEn: [''],
    descriptionAr: [''],
    technicalInfoEn: [''],
    technicalInfoAr: [''],
    categoryId: [''],
    status: ['AVAILABLE'],
    brand: [''],
    modelNumber: [''],
    manufactureYear: [null as number | null],
    countryOfOrigin: [''],
    condition: [''],
    isPublished: [true],
    isFeatured: [false],
    sortOrder: [0],
    metaTitleEn: [''],
    metaTitleAr: [''],
    metaDescriptionEn: [''],
    metaDescriptionAr: [''],
    specifications: this.fb.array([] as FormGroup[]),
  });

  get specs(): FormArray {
    return this.form.get('specifications') as FormArray;
  }

  constructor() {
    this.categories.load().subscribe({ error: () => undefined });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') this.loadMachine(id);
  }

  // --- Loading --------------------------------------------------------------

  private loadMachine(id: string): void {
    this.loading.set(true);

    this.machines.get(id).subscribe({
      next: (machine) => {
        this.machineId.set(machine.id);
        this.applyMachine(machine);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toasts.error(this.i18n.dict().machine.notFound);
        void this.router.navigate(['/admin/machines']);
      },
    });
  }

  private applyMachine(machine: Machine): void {
    this.form.patchValue({
      nameEn: machine.nameEn,
      nameAr: machine.nameAr,
      slug: machine.slug,
      shortDescriptionEn: machine.shortDescriptionEn ?? '',
      shortDescriptionAr: machine.shortDescriptionAr ?? '',
      descriptionEn: machine.descriptionEn ?? '',
      descriptionAr: machine.descriptionAr ?? '',
      technicalInfoEn: machine.technicalInfoEn ?? '',
      technicalInfoAr: machine.technicalInfoAr ?? '',
      categoryId: machine.categoryId ?? '',
      status: machine.status,
      brand: machine.brand ?? '',
      modelNumber: machine.modelNumber ?? '',
      manufactureYear: machine.manufactureYear,
      countryOfOrigin: machine.countryOfOrigin ?? '',
      condition: machine.condition ?? '',
      isPublished: machine.isPublished,
      isFeatured: machine.isFeatured,
      sortOrder: machine.sortOrder,
      metaTitleEn: machine.metaTitleEn ?? '',
      metaTitleAr: machine.metaTitleAr ?? '',
      metaDescriptionEn: machine.metaDescriptionEn ?? '',
      metaDescriptionAr: machine.metaDescriptionAr ?? '',
    });

    this.specs.clear();
    for (const spec of machine.specifications ?? []) {
      this.specs.push(
        this.fb.nonNullable.group({
          labelEn: [spec.labelEn, Validators.required],
          labelAr: [spec.labelAr, Validators.required],
          valueEn: [spec.valueEn, Validators.required],
          valueAr: [spec.valueAr, Validators.required],
          groupEn: [spec.groupEn ?? ''],
          groupAr: [spec.groupAr ?? ''],
        }),
      );
    }

    this.images.set(machine.images ?? []);
    this.documents.set(machine.documents ?? []);
  }

  // --- Specifications -------------------------------------------------------

  protected addSpec(): void {
    this.specs.push(
      this.fb.nonNullable.group({
        labelEn: ['', Validators.required],
        labelAr: ['', Validators.required],
        valueEn: ['', Validators.required],
        valueAr: ['', Validators.required],
        groupEn: [''],
        groupAr: [''],
      }),
    );
    this.form.markAsDirty();
  }

  protected removeSpec(index: number): void {
    this.specs.removeAt(index);
    this.form.markAsDirty();
  }

  // --- Saving ---------------------------------------------------------------

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toasts.error(this.i18n.dict().common.error);
      return;
    }

    this.saving.set(true);
    const payload = this.buildPayload();
    const id = this.machineId();

    const request$ = id ? this.machines.update(id, payload) : this.machines.create(payload);

    request$.subscribe({
      next: (machine) => {
        this.saving.set(false);
        this.form.markAsPristine();
        this.toasts.success(this.i18n.dict().admin.machines.saved);

        if (!id) {
          // Switch into edit mode in place so photographs can be added next,
          // and put the real id in the URL without replaying the load.
          this.machineId.set(machine.id);
          this.applyMachine(machine);
          void this.router.navigate(['/admin/machines', machine.id], { replaceUrl: true });
        } else {
          this.applyMachine(machine);
        }
      },
      error: (failure: ApiFailure) => {
        this.saving.set(false);
        const detail = failure.details?.[0];
        this.toasts.error(
          detail ? `${detail.field}: ${detail.message}` : failure.message || 'Save failed',
        );
      },
    });
  }

  /** Empty strings become null so cleared fields actually clear in the database. */
  private buildPayload(): MachinePayload {
    const value = this.form.getRawValue() as Record<string, unknown>;
    const blank = (key: string) => {
      const raw = value[key];
      return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
    };

    return {
      nameEn: String(value['nameEn']).trim(),
      nameAr: String(value['nameAr']).trim(),
      slug: blank('slug'),
      shortDescriptionEn: blank('shortDescriptionEn'),
      shortDescriptionAr: blank('shortDescriptionAr'),
      descriptionEn: blank('descriptionEn'),
      descriptionAr: blank('descriptionAr'),
      technicalInfoEn: blank('technicalInfoEn'),
      technicalInfoAr: blank('technicalInfoAr'),
      categoryId: blank('categoryId'),
      status: value['status'] as MachinePayload['status'],
      brand: blank('brand'),
      modelNumber: blank('modelNumber'),
      manufactureYear: value['manufactureYear'] ? Number(value['manufactureYear']) : null,
      countryOfOrigin: blank('countryOfOrigin'),
      condition: blank('condition'),
      isPublished: Boolean(value['isPublished']),
      isFeatured: Boolean(value['isFeatured']),
      sortOrder: Number(value['sortOrder']) || 0,
      metaTitleEn: blank('metaTitleEn'),
      metaTitleAr: blank('metaTitleAr'),
      metaDescriptionEn: blank('metaDescriptionEn'),
      metaDescriptionAr: blank('metaDescriptionAr'),
      specifications: this.specs.getRawValue().map((spec: Record<string, string>, index: number) => ({
        labelEn: spec['labelEn'],
        labelAr: spec['labelAr'],
        valueEn: spec['valueEn'],
        valueAr: spec['valueAr'],
        groupEn: spec['groupEn'] || null,
        groupAr: spec['groupAr'] || null,
        sortOrder: index,
      })),
    };
  }

  // --- Images ---------------------------------------------------------------

  protected onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const id = this.machineId();
    if (!input.files?.length || !id) return;

    this.uploading.set(true);
    this.machines.uploadImages(id, input.files).subscribe({
      next: (created) => {
        this.images.update((list) => [...list, ...created]);
        this.uploading.set(false);
        input.value = '';
      },
      error: (failure: ApiFailure) => {
        this.uploading.set(false);
        input.value = '';
        this.toasts.error(failure.message);
      },
    });
  }

  protected setMainImage(image: MachineImage): void {
    const id = this.machineId();
    if (!id || image.isMain) return;

    this.machines.updateImage(id, image.id, { isMain: true }).subscribe({
      next: (updated) => this.images.set(updated),
      error: (failure: ApiFailure) => this.toasts.error(failure.message),
    });
  }

  protected saveImageAlt(image: MachineImage, altEn: string, altAr: string): void {
    const id = this.machineId();
    if (!id) return;

    this.machines.updateImage(id, image.id, { altEn, altAr }).subscribe({
      next: (updated) => {
        this.images.set(updated);
        this.toasts.success(this.i18n.dict().common.save);
      },
      error: (failure: ApiFailure) => this.toasts.error(failure.message),
    });
  }

  protected confirmImageDelete(): void {
    const image = this.pendingImageDelete();
    const id = this.machineId();
    if (!image || !id) return;

    this.machines.deleteImage(id, image.id).subscribe({
      next: (remaining) => {
        this.images.set(remaining);
        this.pendingImageDelete.set(null);
      },
      error: (failure: ApiFailure) => {
        this.pendingImageDelete.set(null);
        this.toasts.error(failure.message);
      },
    });
  }

  // --- Documents ------------------------------------------------------------

  protected onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const id = this.machineId();
    if (!input.files?.length || !id) return;

    this.uploadingDocs.set(true);
    this.machines.uploadDocuments(id, input.files).subscribe({
      next: (created) => {
        this.documents.update((list) => [...list, ...created]);
        this.uploadingDocs.set(false);
        input.value = '';
      },
      error: (failure: ApiFailure) => {
        this.uploadingDocs.set(false);
        input.value = '';
        this.toasts.error(failure.message);
      },
    });
  }

  protected deleteDocument(document: MachineDocument): void {
    const id = this.machineId();
    if (!id) return;

    this.machines.deleteDocument(id, document.id).subscribe({
      next: () => this.documents.update((list) => list.filter((item) => item.id !== document.id)),
      error: (failure: ApiFailure) => this.toasts.error(failure.message),
    });
  }

  protected invalid(field: string): boolean {
    const control = this.form.get(field);
    return Boolean(control && control.invalid && control.touched);
  }
}
