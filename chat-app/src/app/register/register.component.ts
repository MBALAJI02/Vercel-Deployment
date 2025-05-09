import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  isEmailMode: boolean = false
  isOTPMode: boolean = false
  contact: string = '';
  otp: string = '';

  constructor(
    private http: HttpClient,
    private router: Router

  ) {}

  registerationChangeAction() {
    this.isEmailMode = !this.isEmailMode;
  }

  NextAction() {
    console.log('Contact:', this.contact);
  
    // Check if we are not in OTP Mode  
    if (!this.isOTPMode) {
      // Sending OTP to backend
      this.http.post('http://localhost:3000/send-otp', { contact: this.contact }).subscribe(() => {
        this.isOTPMode = true; // Switch to OTP mode on success
        alert('OTP sent to your contact! Please check your email or phone.');
      }, (err) => {
        if (err.status == 400 && err.error.message == 'User already registered') {
          alert('⚠️ This contact is already registered. Please login instead.');
        } else {
          console.error('Error sending OTP:', err);
          alert('❌ There was an error sending OTP. Please try again!');
        }
      });
    } else {
      // Verifying OTP when in OTP Mode
      this.http.post('http://localhost:3000/verify-otp', { contact: this.contact, otp: this.otp }).subscribe(() => {
        alert('✅ Verified successfully!');
        this.router.navigate(['/login']); // Navigate to login page after successful verification
      }, () => {
        alert('❌ Invalid OTP! Please try again.');
      });
    }
  }

  isValidMobileNumber(number: string): boolean {
    const mobileRegex = /^[6-9]\d{9}$/; // Adjust this if needed for international numbers
    return mobileRegex.test(number);
  }
  
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  isValidInput(): boolean {
    if (this.isOTPMode) {
      return this.otp.trim().length > 0;
    } else if (this.isEmailMode) {
      return this.contact.trim().length > 0 && this.isValidEmail(this.contact);
    } else {
      return this.contact.trim().length > 0 && this.isValidMobileNumber(this.contact);
    }
  }
  
  
  

  BackAction() {
    this.isOTPMode = false;
  }

  ResendOTP() {
    this.http.post('http://localhost:3000/send-otp', { contact: this.contact }).subscribe(() => {
      alert('OTP has been resent. Please check your email or phone.');
    }, (err) => {
      console.error('Error resending OTP:', err);
      alert('❌ Failed to resend OTP. Please try again!');
    });
  }
  
  
  backNavigationAction(){
    this.router.navigate(['/login']);
  }



}
