'use server';

import { z } from 'zod';
import { storage } from '@/lib/firebase-admin';

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

type State = {
  success?: boolean;
  message?: string;
};

export async function submitContactForm(prevState: State | null, formData: FormData): Promise<State> {
  const validatedFields = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  });

  if (!validatedFields.success) {
    // The client-side validation should catch this, but this is a safeguard.
    return {
      success: false,
      message: 'Invalid form data. Please check your entries.',
    };
  }
  
  // Here you would typically send an email, save to a database, or call another service.
  // For this example, we'll just log it to the server console.
  console.log('New contact form submission:');
  console.log('Name:', validatedFields.data.name);
  console.log('Email:', validatedFields.data.email);
  console.log('Message:', validatedFields.data.message);

  return {
    success: true,
    message: 'Thank you for your message! We will get back to you soon.',
  };
}

export async function getSignedSplatUrl(filePath: string): Promise<string> {
  try {
    const bucket = storage.bucket();
    
    // The filePath from the client will be the full gs:// or https:// URL.
    // We need to extract just the file path within the bucket.
    // e.g., from https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile.splat?alt=media...
    // to path/to/file.splat
    const url = new URL(filePath);
    const pathWithToken = url.pathname.split('/o/')[1];
    const decodedPath = decodeURIComponent(pathWithToken.split('?')[0]);

    const file = bucket.file(decodedPath);

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-17-2026', // Set a long-lived expiration date
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    // Return an empty string or throw an error to indicate failure.
    // Returning an empty string is often safer for the client to handle.
    return '';
  }
}
