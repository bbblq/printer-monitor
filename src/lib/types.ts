export interface Supply {
    printer_id: number;
    color: string;
    level: number;
    max_capacity: number;
}

export interface Printer {
    id: number;
    name: string;
    brand: string;
    model: string;
    ip: string;
    location: string;
    consumable_model?: string;
    display_order?: number;
    status: string;
    is_online: number;
    last_updated: string;
    supplies: Supply[];
}
