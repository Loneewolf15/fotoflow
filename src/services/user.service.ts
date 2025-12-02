import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);

    constructor() { }

    async uploadDashboardCover(file: File): Promise<string> {
        const user = this.authService.currentUser();
        if (!user || !user.user_id) {
            throw new Error('User not logged in');
        }

        const formData = new FormData();
        formData.append('cover_photo', file);
        formData.append('user_id', user.user_id);

        try {
            const response = await firstValueFrom(this.http.post<{ status: boolean, message: string, url: string }>(
                `${environment.backendUrl}/users/upload_dashboard_cover`,
                formData
            ));

            if (response.status) {
                // Update local user state if needed (optional, but good for UI consistency)
                // For now, just return the URL
                return response.url;
            } else {
                throw new Error(response.message || 'Upload failed');
            }
        } catch (error: any) {
            console.error('Error uploading dashboard cover:', error);
            throw error;
        }
    }

    async getDashboardCover(userId: string): Promise<string | null> {
        try {
            const response = await firstValueFrom(
                this.http.get<{ status: boolean, data: { url: string | null } }>(
                    `${environment.backendUrl}/users/get_default_cover/${userId}`
                )
            );

            return response.status && response.data ? response.data.url : null;
        } catch (error) {
            console.error('Error fetching default cover:', error);
            return null;
        }
    }

    async setDefaultCoverPhoto(file: File): Promise<string> {
        const user = this.authService.currentUser();
        if (!user || !user.user_id) {
            throw new Error('User not logged in');
        }

        const formData = new FormData();
        formData.append('cover_photo', file);
        formData.append('host_id', user.user_id);
        formData.append('set_as_default', 'true');

        try {
            const response = await firstValueFrom(
                this.http.post<{ status: boolean, message: string, data: { url: string } }>(
                    `${environment.backendUrl}/events/upload_cover`,
                    formData
                )
            );

            if (response.status) {
                return response.data.url;
            } else {
                throw new Error(response.message || 'Upload failed');
            }
        } catch (error: any) {
            console.error('Error setting default cover:', error);
            throw error;
        }
    }

    async setDefaultCoverFromUrl(url: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user || !user.user_id) {
            throw new Error('User not logged in');
        }

        const response = await firstValueFrom(
            this.http.post<{ status: boolean, message: string }>(
                `${environment.backendUrl}/users/set_default_cover`,
                { user_id: user.user_id, cover_photo_url: url }
            )
        );

        if (!response.status) {
            throw new Error(response.message || 'Failed to set default cover');
        }
    }
}
