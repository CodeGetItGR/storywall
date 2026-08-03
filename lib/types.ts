export interface User {
    id: string;
    name: string;
    username: string;
    role: 'bride' | 'groom' | 'guest';
    avatarColor: string;
    initials: string;
    bio: string;
    following: number;
    followers: number;
    postCount: number;
}

export interface Post {
    id: string;
    userId: string;
    content: string;
    image?: string;
    createdAt: string;
    likes: number;
    commentCount: number;
    liked: boolean;
    type: 'photo' | 'text';
    tags?: string[];
}

export interface Comment {
    id: string;
    userId: string;
    postId: string;
    content: string;
    createdAt: string;
    likes: number;
}

export interface Story {
    id: string;
    userId: string;
    image: string;
    seen: boolean;
    createdAt: string;
}

export interface Notification {
    id: string;
    type: 'like' | 'comment' | 'rsvp' | 'mention' | 'follow';
    fromUserId: string;
    content: string;
    createdAt: string;
    read: boolean;
    targetId?: string;
}

export interface RSVPGuest {
    id: string;
    name: string;
    status: 'attending' | 'not-attending' | 'pending';
    plusOnes: number;
    message: string;
    respondedAt?: string;
    email: string;
}

export interface GiftItem {
    id: string;
    name: string;
    price: number;
    image?: string;
    reserved: boolean;
    reservedBy?: string;
    category: string;
    link?: string;
    priority: 'high' | 'medium' | 'low';
    notes?: string;
}

export interface ScheduleEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    type: 'ceremony' | 'reception' | 'pre-wedding' | 'social';
    description: string;
    rsvpRequired: boolean;
    attending?: number;
}

export interface PlaylistItem {
    id: string;
    title: string;
    artist: string;
    addedById: string;
    requestedFor: 'ceremony' | 'cocktail' | 'reception' | 'first-dance';
    votes: number;
    voted?: boolean;
}

export interface SeatingTable {
    id: string;
    name: string;
    capacity: number;
    guests: { id: string; name: string }[];
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
}

export interface WishbookEntry {
    id: string;
    userId: string;
    message: string;
    createdAt: string;
    likes: number;
}

export interface VenueInfo {
    name: string;
    address: string;
    city: string;
    description: string;
    amenities: string[];
    heroImage: string;
    gallery: string[];
    mapLink: string;
    phone: string;
    website: string;
}
