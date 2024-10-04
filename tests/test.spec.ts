import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { DashboardPage } from './pages/dashboard-page';
import { ClientsPage } from './pages/clients-page';
import { ClientEditPage } from './pages/clientEdit-page';
import { APIHelper } from './apiHelper';
import { DataGenerator } from './testData';

const test_username: any = process.env.TEST_USERNAME;
const test_password: any = process.env.TEST_PASSWORD;
const baseUrl = `${process.env.BASE_URL}`;


test.describe('Front-end tests', () => {

  test('Test 1 - Edit a client', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const clientsPage = new ClientsPage(page);
    const clientEditPage = new ClientEditPage(page);

    await loginPage.goto();
    await loginPage.performLogin(test_username, test_password);

    await dashboardPage.goToClientView();
    await expect(clientsPage.createClientButton).toBeVisible();
    const firstClientBeforeEdit = await clientsPage.firstClientInList.allTextContents();
 
    await clientsPage.goToEditClient();
    await expect(clientEditPage.pageHeading).toBeVisible();
    await expect(page.url()).toContain(clientEditPage.pageUrl);
    await clientEditPage.editClient();

    await expect(clientsPage.backButton).toBeVisible();
    const firstClientAfterEdit = await clientsPage.firstClientInList.allTextContents();
    await expect(firstClientAfterEdit).not.toBe(firstClientBeforeEdit);
    await expect(clientsPage.createClientButton).toBeVisible();

    await dashboardPage.performLogout();
  });

  test('Test 2 - Delete a client via options-button', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const clientsPage = new ClientsPage(page);

    await loginPage.goto();
    await loginPage.performLogin(test_username, test_password);

    await dashboardPage.goToClientView();
    const clientsBeforeDelete = await clientsPage.clientElements.count();
    console.log(clientsBeforeDelete);

    await clientsPage.deleteClient();
    await expect(clientsPage.backButton).toBeVisible();
    const clientsAfterDelete = await clientsPage.clientElements.count();
    console.log(clientsAfterDelete);
    expect(clientsBeforeDelete - clientsAfterDelete).toEqual(1);

    await dashboardPage.performLogout();
  });
});


test.describe('Backend tests', () => {
  let apiHelper: APIHelper;
  let dataGenerator: DataGenerator;

  test.beforeAll('login, get access token', async ({ request }) => {
      apiHelper = new APIHelper(baseUrl);
      dataGenerator = new DataGenerator();
      const login = await apiHelper.login(request);
      expect(login.status()).toBe(200);
  });


  test('Test 1 - create new room', async ({ request }) => {
      const payload = dataGenerator.generateRoomData();
      const createRoom = await apiHelper.createRoom(request, payload);
      expect(createRoom.ok()).toBeTruthy();
      expect(await createRoom.json()).toMatchObject(
          expect.objectContaining(payload)
      );

      const getRooms = await apiHelper.getRooms(request);
      expect(await getRooms.json()).toEqual(
          expect.arrayContaining([
              expect.objectContaining(payload)
          ])
      );
  });

  test('Test 2 - edit room', async ({ request }) => {
      const getRooms = await apiHelper.getRooms(request);
      const allRooms = await getRooms.json();
      const penultimateRoom = allRooms[allRooms.length - 2];

      const payload = dataGenerator.editRoomData(penultimateRoom.id, penultimateRoom.created);

      const editRoom = await apiHelper.editRoom(request, penultimateRoom.id, payload);
      expect(editRoom.ok()).toBeTruthy();
      expect(await editRoom.json()).not.toEqual(penultimateRoom);

      const getRoomById = await apiHelper.getRoomById(request, penultimateRoom.id);
      expect(await getRoomById.json()).toEqual(payload);
  });
});