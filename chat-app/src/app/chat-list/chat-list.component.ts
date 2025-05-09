import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.css'],
  encapsulation: ViewEncapsulation.Emulated 
})
export class ChatListComponent {
  users: string[] = [];
  username: string | null = ''
  showSearchInput = false;
  searchQuery = '';
  searchedUsers: any[] = [];
  private socket!: Socket;
  typingStatus: { [username: string]: boolean } = {};
  loggedInUsername: string | null = localStorage.getItem('username');
  unreadMessages: { [username: string]: { count: number, lastMessageTime: Date, lastMessage: string } } = {};

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.socket = io('http://localhost:4000');

    this.username = localStorage.getItem('username');
    if (!this.username) {
      this.router.navigate(['/login']);
      return;
    }

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && this.router.url === '/chat-list') {
        this.fetchUserFromDb();
      }
    });
    

    this.socket.on('new_message_sent', (data) => {
      if (data.to == this.loggedInUsername && !this.users.includes(data.from)) {
        this.users.unshift(data.from);  // Add to chat list at top
        this.unreadMessages[data.from] = {
          count: 0,
          lastMessage: data.message,
          lastMessageTime: data.timestamp
        };
        this.cdRef.detectChanges();
      }
    });
    

    this.liveTypingAction()
    this.fetchUserFromDb();
    this.liveUnreadCountAction();
    this.fetchUnreadMessages();
  }

  fetchUserFromDb() {
    this.http.get<string[]>(`http://localhost:3000/get-messaged-users/${this.username}`)
      .subscribe(
        res => this.users = res,
        err => console.error('Error fetching users:', err)
      );
  }

  fetchUnreadMessages() {
    this.http.get<{ username: string, count: number, lastMessageTime: Date, lastMessage: string }[]>('http://localhost:3000/get-unread-messages/' + this.username)
      .subscribe((unreadMessages) => {
        unreadMessages.forEach((message) => {
          this.unreadMessages[message.username] = { count: message.count, lastMessageTime: message.lastMessageTime, lastMessage: message.lastMessage };
          console.log("unreadMessages::::::::::::",this.unreadMessages[message.username] )
        });
      });
  }

  getUnreadCount(user: string) {
    if (this.unreadMessages && this.unreadMessages[user]) {
      return this.unreadMessages[user].count;
    }
    return 0;
  }

  getMessageTime(user: string){
    if (this.unreadMessages && this.unreadMessages[user]) {
      return this.unreadMessages[user].lastMessageTime;
    } 
    return 0;
   
  }

  getLastMessage(user: string) {
    if (this.unreadMessages && this.unreadMessages[user]) {
      return this.unreadMessages[user].lastMessage;      
    }
    return 0;
  }
  


  searchUser() {
    if (this.searchQuery.length > 0) {
      this.http.post<any[]>('http://localhost:3000/search-user', { query: this.searchQuery }).subscribe(
        (res) => this.searchedUsers = res,
        (err) => console.error('Search error:', err)
      );
    } else {
      this.searchedUsers = [];
    }
  }

  sendMessageTo(user: string, message: string) {
    if (!message.trim()) return;

    const currentUser = this.loggedInUsername;

    this.http.post('http://localhost:3000/send-message', {
      from: currentUser,
      to: user,
      message: message
    }).subscribe(
      () => {

      },
      (err) => console.error('Message send error:', err)
    );
  }


  liveTypingAction() {
    this.socket.on('user_typing_chatList', (data) => {
      if (data.to == this.loggedInUsername) {
        this.typingStatus[data.from] = true;    
        setTimeout(() => {
          this.typingStatus[data.from] = false;
        }, 1000);
      }
    });
  }

  liveUnreadCountAction(){
    this.socket.on('update_unread', (data) => {
      const sender = data.from;
      const currentTime = new Date();

      if (data.to == this.loggedInUsername){
        if (this.unreadMessages[sender]) {
          this.unreadMessages[sender].count += 1;
          this.unreadMessages[sender].lastMessageTime = currentTime;
          this.unreadMessages[sender].lastMessage = data.message;          
        } else {
          this.unreadMessages[sender] = {
            count: 1,
            lastMessageTime: new Date(),
            lastMessage: data.message
          };
        }
         this.cdRef.detectChanges();
      }      
    });
  }

  openConversation(username: string) {
    this.http.post('http://localhost:3000/mark-messages-read', {
      from: this.username,
      to: username
    }, { responseType: 'text' }).subscribe(() => {
      this.unreadMessages[username] = { count: 0, lastMessageTime: new Date(), lastMessage: '' };
      this.router.navigate(['/chat-conversation', username]);
    });
  }


  addUserAction() {
    this.showSearchInput = true;
    this.searchedUsers = [];
    this.searchQuery = '';
  }

  searchCloseAction() {
    this.searchQuery = '';
    this.searchedUsers = [];
    this.showSearchInput = false;
  }

  logout() {
    localStorage.removeItem('username');
    this.router.navigate(['/login']);
  }
}
